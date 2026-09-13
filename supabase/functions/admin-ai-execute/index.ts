import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Step {
  id: number;
  type: string;
  label: string;
  params: Record<string, any>;
}

function sse(event: string, data: any) {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  const { data: isTeacher } = await userClient.rpc("has_role", { _user_id: user.id, _role: "teacher" });
  if (!isAdmin && !isTeacher) {
    return new Response(JSON.stringify({ error: "Staff only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Steps a teacher (non-admin) may run — scoped to their own classes / own schedule.
  const TEACHER_ALLOWED = new Set([
    "create_class", "generate_dummy_students", "create_student", "bulk_create_students",
    "create_student_logins", "create_announcement", "delete_announcement",
    "add_schedule_period", "generate_weekly_schedule", "clear_teacher_schedule",
    "move_student_class",
  ]);

  const { data: profile } = await userClient.from("profiles").select("school_id").eq("user_id", user.id).maybeSingle();
  const schoolId = profile?.school_id;
  if (!schoolId) {
    return new Response(JSON.stringify({ error: "Your account has no school assigned" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const { steps } = (await req.json()) as { steps: Step[] };
  if (!Array.isArray(steps)) {
    return new Response(JSON.stringify({ error: "steps array required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const createdTeachers: Record<string, string> = {};
      let totalSucceeded = 0;
      let totalFailed = 0;

      const findTeacherIdByEmail = async (email: string): Promise<string | null> => {
        const key = String(email || "").trim().toLowerCase();
        if (!key) return null;
        if (createdTeachers[key]) return createdTeachers[key];
        // Multiple profile rows can share an email/name — never use maybeSingle here.
        const { data: byEmail } = await admin
          .from("profiles").select("user_id")
          .eq("school_id", schoolId).ilike("email", key).limit(1);
        if (byEmail && byEmail.length) return byEmail[0].user_id;
        // Fallback: the planner sometimes passes a teacher name instead of an email.
        const { data: byName } = await admin
          .from("profiles").select("user_id")
          .eq("school_id", schoolId).ilike("full_name", key).limit(1);
        return byName?.[0]?.user_id ?? null;
      };

      const findClassByLevelSection = async (level: number, section: string) => {
        // A level+section can have several class rows (one per subject) — take the first.
        let q = admin.from("classes").select("id, teacher_id")
          .eq("school_id", schoolId).eq("level", level);
        if (section) q = q.ilike("section", section);
        const { data } = await q.order("created_at", { ascending: true }).limit(1);
        return data?.[0] ?? null;

      };

      // Teachers may only touch classes they own or are an accepted member of.
      const assertClassAccess = async (classId: string) => {
        if (isAdmin) return;
        const { data: ok } = await userClient.rpc("is_class_member", { _user_id: user.id, _class_id: classId });
        if (!ok) throw new Error("You can only manage your own classes");
      };

      // Create a real login account + student record.
      const createStudentAccount = async (
        cls: { id: string; level?: number | null; section?: string | null },
        s: Record<string, any>,
      ) => {
        const fullName = String(s.full_name || "").trim();
        if (!fullName) throw new Error("full_name required");

        let roll = String(s.roll_number || "").trim();
        if (!roll) {
          const { data: rows } = await admin.from("students").select("roll_number").eq("class_id", cls.id);
          const max = (rows || []).reduce((acc: number, r: any) => {
            const n = parseInt(String(r.roll_number || "").replace(/\D/g, ""));
            return isNaN(n) ? acc : Math.max(acc, n);
          }, 0);
          roll = String(max + 1);
        }

        const levelPart = String(cls.level ?? "0").toLowerCase();
        const sectionPart = String(cls.section ?? "a").trim().toLowerCase();
        const namePart = fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "student";
        const email = `${namePart}.${roll}.${levelPart}${sectionPart}.${Math.random().toString(36).slice(2, 6)}@aks.school.app`;
        const password = "aksmsb";

        const { data: created, error: authErr } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { full_name: fullName, role: "student", school_id: schoolId },
        });
        if (authErr) throw new Error(authErr.message);

        await admin.from("profiles").upsert(
          { user_id: created.user.id, full_name: fullName, email, school_id: schoolId },
          { onConflict: "user_id" },
        );
        await admin.from("user_roles").upsert(
          { user_id: created.user.id, role: "student" }, { onConflict: "user_id,role" },
        );

        const { error: stuErr } = await admin.from("students").insert({
          school_id: schoolId, class_id: cls.id, full_name: fullName, roll_number: roll,
          student_id: `STU-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          user_id: created.user.id, created_by: user.id,
          login_email: email, password_text: password,
          parent_father_name: s.father_name?.trim() || null,
          parent_mother_name: s.mother_name?.trim() || null,
          parent_mobile: s.mobile?.trim() || null,
          parent_email: s.parent_email?.trim() || null,
          date_of_birth: s.date_of_birth || null,
          gender: s.gender?.trim() || null,
        });
        if (stuErr) {
          await admin.auth.admin.deleteUser(created.user.id);
          throw new Error(stuErr.message);
        }
        return { full_name: fullName, roll_number: roll, login_email: email, password };
      };

      // Give existing students (without a login) an account.
      const backfillStudentLogins = async (classId: string, limit: number) => {
        const { data: rows } = await admin.from("students")
          .select("id, full_name, roll_number, login_email, user_id")
          .eq("class_id", classId).is("user_id", null).limit(limit);
        const { data: cls } = await admin.from("classes").select("level, section").eq("id", classId).maybeSingle();
        const credentials: any[] = [];
        const errors: string[] = [];
        for (const st of rows || []) {
          try {
            const namePart = String(st.full_name || "student").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "student";
            const roll = String(st.roll_number || "0");
            const email = `${namePart}.${roll}.${String(cls?.level ?? 0)}${String(cls?.section ?? "a").toLowerCase()}.${Math.random().toString(36).slice(2, 6)}@aks.school.app`;
            const password = "aksmsb";
            const { data: created, error } = await admin.auth.admin.createUser({
              email, password, email_confirm: true,
              user_metadata: { full_name: st.full_name, role: "student", school_id: schoolId },
            });
            if (error) throw new Error(error.message);
            await admin.from("profiles").upsert(
              { user_id: created.user.id, full_name: st.full_name, email, school_id: schoolId },
              { onConflict: "user_id" },
            );
            await admin.from("user_roles").upsert(
              { user_id: created.user.id, role: "student" }, { onConflict: "user_id,role" },
            );
            await admin.from("students").update({
              user_id: created.user.id, login_email: email, password_text: password,
            }).eq("id", st.id);
            credentials.push({ full_name: st.full_name, roll_number: roll, login_email: email, password });
          } catch (e) {
            errors.push(`${st.full_name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        return { created: credentials.length, credentials, errors: errors.slice(0, 10) };
      };

      controller.enqueue(sse("start", { total: steps.length }));

      for (const step of steps) {
        controller.enqueue(sse("step_start", { id: step.id, label: step.label, type: step.type }));
        try {
          let result: any = {};
          const p = step.params || {};

          if (!isAdmin && !TEACHER_ALLOWED.has(step.type)) {
            throw new Error("Only an administrator can run this action");
          }
          // Teachers can only schedule/act for themselves.
          if (!isAdmin && ["add_schedule_period", "generate_weekly_schedule", "clear_teacher_schedule"].includes(step.type)) {
            p.email = user.email;
          }
          if (!isAdmin && step.type === "create_class") {
            p.teacher_email = user.email;
          }



          switch (step.type) {
            case "create_teacher": {
              const email = String(p.email || "").trim().toLowerCase();
              const fullName = String(p.full_name || "").trim();
              const password = String(p.password || "aksmsb123");
              const staffRole = p.staff_role || null;
              if (!email || !fullName) throw new Error("email and full_name required");

              const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
              const dup = existing?.users?.find((u) => (u.email || "").toLowerCase() === email);
              if (dup) {
                createdTeachers[email] = dup.id;
                result = { skipped: true, reason: "Email already exists", user_id: dup.id };
                break;
              }

              const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email, password, email_confirm: true,
                user_metadata: { full_name: fullName, role: "teacher", school_id: schoolId },
              });
              if (createErr) throw new Error(createErr.message);

              const { error: profErr } = await admin.from("profiles").upsert({
                user_id: created.user.id,
                full_name: fullName,
                email,
                school_id: schoolId,
                ...(staffRole ? { staff_role: staffRole } : {}),
              }, { onConflict: "user_id" });
              if (profErr) {
                await admin.auth.admin.deleteUser(created.user.id);
                throw new Error(`Could not set up teacher account: ${profErr.message}`);
              }
              const { error: roleErr2 } = await admin.from("user_roles")
                .upsert({ user_id: created.user.id, role: "teacher" }, { onConflict: "user_id,role" });
              if (roleErr2) {
                await admin.auth.admin.deleteUser(created.user.id);
                throw new Error(`Could not give teacher access: ${roleErr2.message}`);
              }
              createdTeachers[email] = created.user.id;
              result = { user_id: created.user.id, email, password };
              break;
            }

            case "create_class": {
              const level = parseInt(p.level);
              const section = String(p.section || "").toUpperCase().slice(0, 1);
              const subject = String(p.subject || "General");
              const teacherEmail = String(p.teacher_email || "").trim().toLowerCase();
              if (!level || !section || !teacherEmail) throw new Error("level, section, teacher_email required");

              const teacherId = await findTeacherIdByEmail(teacherEmail);
              if (!teacherId) throw new Error(`Teacher ${teacherEmail} not found`);

              const { data: existing } = await admin.from("classes").select("id")
                .eq("school_id", schoolId).eq("level", level).eq("section", section).maybeSingle();
              if (existing) {
                result = { skipped: true, reason: "Class already exists", class_id: existing.id };
                break;
              }

              const { data: cls, error: clsErr } = await admin.from("classes")
                .insert({ school_id: schoolId, level, section, subject, teacher_id: teacherId })
                .select("id").single();
              if (clsErr) throw new Error(clsErr.message);
              result = { class_id: cls.id, level, section, subject };
              break;
            }

            case "generate_dummy_students": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const count = Math.max(1, Math.min(50, parseInt(p.count) || 10));
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data: full } = await admin.from("classes").select("id, level, section").eq("id", cls.id).single();
              const first = ["Ali","Hamza","Bilal","Hassan","Usman","Ahmed","Zain","Ibrahim","Faizan","Talha","Owais","Saad","Yousuf","Arham","Daniyal","Kamran","Rayan","Uzair","Wasif","Numan"];
              const last = ["Khan","Ali","Ahmed","Raza","Hussain","Iqbal","Farooq","Aslam","Nawaz","Sheikh","Qureshi","Siddiqui","Malik","Chaudhry","Bhatti","Awan"];
              const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
              const credentials: any[] = [];
              const errors: string[] = [];
              for (let i = 0; i < count; i++) {
                try {
                  credentials.push(await createStudentAccount(full!, {
                    full_name: `${pick(first)} ${pick(last)}`,
                    father_name: `${pick(first)} ${pick(last)}`,
                    mobile: "03" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0"),
                    gender: "male",
                  }));
                } catch (e) { errors.push(e instanceof Error ? e.message : "failed"); }
              }
              result = { inserted: credentials.length, credentials, errors: errors.slice(0, 5) };
              break;
            }


            case "create_announcement": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const title = String(p.title || "").trim();
              const content = String(p.content || "").trim();
              if (!title || !content) throw new Error("title and content required");
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data, error } = await admin.from("announcements")
                .insert({ class_id: cls.id, teacher_id: cls.teacher_id, title, content, is_pinned: !!p.is_pinned })
                .select("id").single();
              if (error) throw new Error(error.message);
              result = { announcement_id: data.id };
              break;
            }

            case "create_exam_term": {
              const name = String(p.name || "").trim();
              const termType = String(p.term_type || "bimonthly");
              const academicYear = String(p.academic_year || "");
              const startDate = String(p.start_date || "");
              const endDate = String(p.end_date || "");
              if (!name || !academicYear || !startDate || !endDate) {
                throw new Error("name, academic_year, start_date, end_date required");
              }
              const { data, error } = await admin.from("exam_terms")
                .insert({
                  school_id: schoolId, name, term_type: termType, academic_year: academicYear,
                  start_date: startDate, end_date: endDate, pass_percentage: p.pass_percentage ?? 40,
                })
                .select("id").single();
              if (error) throw new Error(error.message);
              result = { term_id: data.id };
              break;
            }

            // ---------- DESTRUCTIVE ----------
            case "delete_class": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              await admin.from("students").delete().eq("class_id", cls.id);
              await admin.from("announcements").delete().eq("class_id", cls.id);
              const { error } = await admin.from("classes").delete().eq("id", cls.id);
              if (error) throw new Error(error.message);
              result = { deleted_class_id: cls.id };
              break;
            }

            case "delete_teacher": {
              const email = String(p.email || "").trim().toLowerCase();
              if (!email) throw new Error("email required");
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              await admin.from("user_roles").delete().eq("user_id", teacherId);
              await admin.from("profiles").delete().eq("user_id", teacherId);
              const { error } = await admin.auth.admin.deleteUser(teacherId);
              if (error) throw new Error(error.message);
              result = { deleted_user_id: teacherId, email };
              break;
            }

            case "delete_all_dummy_students": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data, error } = await admin.from("students").delete().eq("class_id", cls.id).select("id");
              if (error) throw new Error(error.message);
              result = { deleted_count: data?.length ?? 0 };
              break;
            }

            case "delete_announcement": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const titleContains = String(p.title_contains || "").trim();
              if (!titleContains) throw new Error("title_contains required");
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data, error } = await admin.from("announcements").delete()
                .eq("class_id", cls.id).ilike("title", `%${titleContains}%`).select("id");
              if (error) throw new Error(error.message);
              result = { deleted_count: data?.length ?? 0 };
              break;
            }

            case "delete_exam_term": {
              const name = String(p.name || "").trim();
              if (!name) throw new Error("name required");
              const { data, error } = await admin.from("exam_terms").delete()
                .eq("school_id", schoolId).ilike("name", name).select("id");
              if (error) throw new Error(error.message);
              result = { deleted_count: data?.length ?? 0 };
              break;
            }

            // ---------- UPDATE ----------
            case "rename_class": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const patch: any = {};
              if (p.new_subject) patch.subject = String(p.new_subject);
              if (p.new_section) patch.section = String(p.new_section).toUpperCase().slice(0, 1);
              const { error } = await admin.from("classes").update(patch).eq("id", cls.id);
              if (error) throw new Error(error.message);
              result = { updated_class_id: cls.id, ...patch };
              break;
            }

            case "update_teacher_role": {
              const email = String(p.email || "").trim().toLowerCase();
              const staffRole = String(p.staff_role || "");
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              const { error } = await admin.rpc("set_teacher_staff_role", {
                _teacher_user_id: teacherId, _staff_role: staffRole,
              });
              if (error) throw new Error(error.message);
              result = { teacher: email, staff_role: staffRole };
              break;
            }

            case "assign_teacher_to_class": {
              const email = String(p.email || "").trim().toLowerCase();
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const role = String(p.role || "subject_lead");
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data: existing } = await admin.from("class_teachers").select("id")
                .eq("class_id", cls.id).eq("teacher_id", teacherId).maybeSingle();
              if (existing) {
                await admin.from("class_teachers").update({
                  role, invitation_status: "accepted", is_class_admin: role === "class_admin",
                }).eq("id", existing.id);
                result = { updated: true, class_teacher_id: existing.id };
              } else {
                const { data, error } = await admin.from("class_teachers").insert({
                  class_id: cls.id, teacher_id: teacherId, role,
                  is_class_admin: role === "class_admin",
                  invitation_status: "accepted", invited_by: user.id,
                }).select("id").single();
                if (error) throw new Error(error.message);
                result = { created: true, class_teacher_id: data.id };
              }
              break;
            }

            case "unassign_teacher_from_class": {
              const email = String(p.email || "").trim().toLowerCase();
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data, error } = await admin.from("class_teachers").delete()
                .eq("class_id", cls.id).eq("teacher_id", teacherId).select("id");
              if (error) throw new Error(error.message);
              result = { removed_count: data?.length ?? 0 };
              break;
            }

            case "add_schedule_period": {
              const email = String(p.email || "").trim().toLowerCase();
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const day = parseInt(p.day_of_week);
              const period = parseInt(p.period);
              const start = String(p.start_time || "");
              const end = String(p.end_time || "");
              if (isNaN(day) || day < 0 || day > 6) throw new Error("day_of_week must be 0-6");
              if (!period || !start || !end) throw new Error("period, start_time, end_time required");
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data, error } = await admin.from("teacher_schedules").insert({
                teacher_id: teacherId, class_id: cls.id, day_of_week: day, period,
                start_time: start, end_time: end,
                room_number: p.room_number ?? null, subject: p.subject ?? null,
              }).select("id").single();
              if (error) throw new Error(error.message);
              result = { schedule_id: data.id };
              break;
            }

            case "clear_teacher_schedule": {
              const email = String(p.email || "").trim().toLowerCase();
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              let q = admin.from("teacher_schedules").delete().eq("teacher_id", teacherId);
              if (p.day_of_week !== undefined && p.day_of_week !== null) {
                q = q.eq("day_of_week", parseInt(p.day_of_week));
              }
              const { data, error } = await q.select("id");
              if (error) throw new Error(error.message);
              result = { removed_count: data?.length ?? 0 };
              break;
            }

            case "generate_weekly_schedule": {
              const email = String(p.email || "").trim().toLowerCase();
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const period = parseInt(p.period);
              const start = String(p.start_time || "");
              const end = String(p.end_time || "");
              const days: number[] = Array.isArray(p.days) ? p.days.map((d: any) => parseInt(d)).filter((d: number) => d >= 0 && d <= 6) : [];
              if (!days.length || !period || !start || !end) throw new Error("days, period, start_time, end_time required");
              const teacherId = await findTeacherIdByEmail(email);
              if (!teacherId) throw new Error(`Teacher ${email} not found`);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const rows = days.map((d) => ({
                teacher_id: teacherId, class_id: cls.id, day_of_week: d, period,
                start_time: start, end_time: end,
                room_number: p.room_number ?? null, subject: p.subject ?? null,
              }));
              const { data, error } = await admin.from("teacher_schedules").insert(rows).select("id");
              if (error) throw new Error(error.message);
              result = { inserted: data?.length ?? 0 };
              break;
            }

            case "bulk_create_teachers": {
              const list: any[] = Array.isArray(p.teachers) ? p.teachers : [];
              if (!list.length) throw new Error("teachers array required");
              const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
              const existingEmails = new Set((existing?.users || []).map((u) => (u.email || "").toLowerCase()));
              let created = 0, skipped = 0;
              const errors: string[] = [];
              for (const t of list) {
                try {
                  const email = String(t.email || "").trim().toLowerCase();
                  const fullName = String(t.full_name || "").trim();
                  if (!email || !fullName) { errors.push(`Missing email/name`); continue; }
                  if (existingEmails.has(email)) { skipped++; continue; }
                  const { data: c, error } = await admin.auth.admin.createUser({
                    email, password: String(t.password || "aksmsb123"), email_confirm: true,
                    user_metadata: { full_name: fullName, role: "teacher", school_id: schoolId },
                  });
                  if (error) { errors.push(`${email}: ${error.message}`); continue; }
                  const { error: pe } = await admin.from("profiles").upsert({
                    user_id: c.user.id, full_name: fullName, email, school_id: schoolId,
                    ...(t.staff_role ? { staff_role: t.staff_role } : {}),
                  }, { onConflict: "user_id" });
                  if (pe) { errors.push(`${email}: ${pe.message}`); continue; }
                  const { error: re } = await admin.from("user_roles")
                    .upsert({ user_id: c.user.id, role: "teacher" }, { onConflict: "user_id,role" });
                  if (re) { errors.push(`${email}: ${re.message}`); continue; }
                  createdTeachers[email] = c.user.id;
                  existingEmails.add(email);
                  created++;
                } catch (e) { errors.push(e instanceof Error ? e.message : "err"); }
              }
              result = { created, skipped, errors: errors.slice(0, 10) };
              break;
            }

            case "bulk_create_classes": {
              const list: any[] = Array.isArray(p.classes) ? p.classes : [];
              if (!list.length) throw new Error("classes array required");
              let created = 0, skipped = 0;
              const errors: string[] = [];
              for (const c of list) {
                try {
                  const level = parseInt(c.level);
                  const section = String(c.section || "").toUpperCase().slice(0, 1);
                  const subject = String(c.subject || "General");
                  const teacherEmail = String(c.teacher_email || "").trim().toLowerCase();
                  if (!level || !section || !teacherEmail) { errors.push("missing fields"); continue; }
                  const teacherId = await findTeacherIdByEmail(teacherEmail);
                  if (!teacherId) { errors.push(`Teacher ${teacherEmail} not found`); continue; }
                  const { data: dup } = await admin.from("classes").select("id")
                    .eq("school_id", schoolId).eq("level", level).eq("section", section).maybeSingle();
                  if (dup) { skipped++; continue; }
                  const { error } = await admin.from("classes")
                    .insert({ school_id: schoolId, level, section, subject, teacher_id: teacherId });
                  if (error) { errors.push(`${level}-${section}: ${error.message}`); continue; }
                  created++;
                } catch (e) { errors.push(e instanceof Error ? e.message : "err"); }
              }
              result = { created, skipped, errors: errors.slice(0, 10) };
              break;
            }

            case "bulk_full_schedule": {
              const assignments: any[] = Array.isArray(p.assignments) ? p.assignments : [];
              const days: number[] = (Array.isArray(p.days) ? p.days : [1,2,3,4,5])
                .map((d: any) => parseInt(d)).filter((d: number) => d >= 0 && d <= 6);
              const periods: number[] = (Array.isArray(p.periods) ? p.periods : [1,2,3,4,5,6,7,8])
                .map((x: any) => parseInt(x)).filter((x: number) => x >= 1 && x <= 12);
              const startTime: string = String(p.start_time || "08:00");
              const periodMin: number = parseInt(p.period_minutes) || 40;
              const breakAfter: number[] = Array.isArray(p.break_after) ? p.break_after.map((n: any) => parseInt(n)) : [4];
              const clearExisting = p.clear_existing !== false;

              if (!assignments.length) throw new Error("assignments array required");

              // Compute time slots once (period -> {start,end})
              const [sh, sm] = startTime.split(":").map((n) => parseInt(n));
              let cursor = sh * 60 + (sm || 0);
              const slots: Record<number, { start: string; end: string }> = {};
              const allPeriods = [...periods].sort((a, b) => a - b);
              for (const per of allPeriods) {
                const sH = Math.floor(cursor / 60), sM = cursor % 60;
                const endMin = cursor + periodMin;
                const eH = Math.floor(endMin / 60), eM = endMin % 60;
                slots[per] = {
                  start: `${String(sH).padStart(2,"0")}:${String(sM).padStart(2,"0")}`,
                  end:   `${String(eH).padStart(2,"0")}:${String(eM).padStart(2,"0")}`,
                };
                cursor = endMin + (breakAfter.includes(per) ? 15 : 0);
              }

              // Resolve teachers + classes upfront
              const resolved: { teacherId: string; classId: string; subject: string | null; room: string | null }[] = [];
              const errors: string[] = [];
              for (const a of assignments) {
                const email = String(a.email || a.teacher_email || "").trim().toLowerCase();
                // Accept class_level/class_section or a combined "10-A" / "10 A" class name.
                let level = parseInt(a.class_level);
                let section = String(a.class_section || "").toUpperCase().slice(0, 1);
                const name = String(a.class_name || a.class || "").trim();
                if ((isNaN(level) || !section) && name) {
                  const m = name.match(/(\d{1,2})\s*[-\s_]?\s*([A-Za-z])?/);
                  if (m) {
                    if (isNaN(level)) level = parseInt(m[1]);
                    if (!section && m[2]) section = m[2].toUpperCase();
                  }
                }
                const teacherId = await findTeacherIdByEmail(email);
                if (!teacherId) { errors.push(`Teacher ${email || "(no email)"} not found`); continue; }

                let classId: string | null = null;
                if (!isNaN(level)) {
                  const cls = await findClassByLevelSection(level, section);
                  if (cls) classId = cls.id;
                }
                if (!classId) {
                  // Fall back to a class this teacher already owns.
                  const { data: own } = await admin.from("classes").select("id")
                    .eq("school_id", schoolId).eq("teacher_id", teacherId)
                    .order("created_at", { ascending: true }).limit(1);
                  classId = own?.[0]?.id ?? null;
                }
                if (!classId) {
                  errors.push(`No class found for ${email}${isNaN(level) ? "" : ` (${level}-${section || "?"})`}`);
                  continue;
                }
                resolved.push({
                  teacherId, classId,
                  subject: a.subject ?? null, room: a.room_number ?? null,
                });
              }

              if (!resolved.length) {
                throw new Error(`Could not assign any periods. ${errors.slice(0, 5).join("; ") || "No matching teachers or classes."}`);
              }

              if (clearExisting && resolved.length) {
                const teacherIds = [...new Set(resolved.map((r) => r.teacherId))];
                await admin.from("teacher_schedules").delete().in("teacher_id", teacherIds).in("day_of_week", days);
              }

              // Build all rows (de-duplicated per teacher/day/period)
              const rows: any[] = [];
              const seen = new Set<string>();
              for (const r of resolved) {
                for (const d of days) {
                  for (const per of allPeriods) {
                    const key = `${r.teacherId}|${d}|${per}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const slot = slots[per];
                    rows.push({
                      teacher_id: r.teacherId, class_id: r.classId,
                      day_of_week: d, period: per,
                      start_time: slot.start, end_time: slot.end,
                      room_number: r.room, subject: r.subject,
                    });
                  }
                }
              }

              // Insert in chunks of 500
              let inserted = 0;
              for (let i = 0; i < rows.length; i += 500) {
                const chunk = rows.slice(i, i + 500);
                const { data, error } = await admin.from("teacher_schedules").insert(chunk).select("id");
                if (error) { errors.push(`${error.message}`); continue; }
                inserted += data?.length ?? 0;
              }
              if (!inserted) {
                throw new Error(`No periods were saved. ${errors.slice(0, 5).join("; ") || "Unknown database error."}`);
              }
              result = {
                inserted, teachers: resolved.length, days: days.length, periods: allPeriods.length,
                errors: errors.slice(0, 10),
              };
              break;
            }


            case "create_student": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data: full } = await admin.from("classes").select("id, level, section").eq("id", cls.id).single();
              result = await createStudentAccount(full!, p);
              break;
            }

            case "bulk_create_students": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const list: any[] = Array.isArray(p.students) ? p.students : [];
              if (!list.length) throw new Error("students array required");
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              const { data: full } = await admin.from("classes").select("id, level, section").eq("id", cls.id).single();
              const credentials: any[] = [];
              const errors: string[] = [];
              for (const s of list.slice(0, 60)) {
                try { credentials.push(await createStudentAccount(full!, s)); }
                catch (e) { errors.push(`${s.full_name ?? "row"}: ${e instanceof Error ? e.message : "failed"}`); }
              }
              result = { created: credentials.length, credentials, errors: errors.slice(0, 10) };
              break;
            }

            case "create_student_logins": {
              const level = parseInt(p.class_level);
              const section = String(p.class_section || "").toUpperCase().slice(0, 1);
              const limit = Math.max(1, Math.min(60, parseInt(p.limit) || 60));
              const cls = await findClassByLevelSection(level, section);
              if (!cls) throw new Error(`Class ${level}-${section} not found`);
              await assertClassAccess(cls.id);
              result = await backfillStudentLogins(cls.id, limit);
              break;
            }

            case "move_student_class": {
              const name = String(p.full_name || "").trim();
              if (!name) throw new Error("full_name required");
              const toLevel = parseInt(p.to_class_level);
              const toSection = String(p.to_class_section || "").toUpperCase().slice(0, 1);
              const target = await findClassByLevelSection(toLevel, toSection);
              if (!target) throw new Error(`Class ${toLevel}-${toSection} not found`);
              await assertClassAccess(target.id);
              const { data: stu } = await admin.from("students").select("id, class_id")
                .eq("school_id", schoolId).ilike("full_name", name).limit(1).maybeSingle();
              if (!stu) throw new Error(`Student ${name} not found`);
              if (stu.class_id) await assertClassAccess(stu.class_id);
              const { error } = await admin.from("students").update({ class_id: target.id }).eq("id", stu.id);
              if (error) throw new Error(error.message);
              result = { student: name, moved_to: `${toLevel}-${toSection}` };
              break;
            }

            default:

              throw new Error(`Unknown step type: ${step.type}`);
          }

          totalSucceeded++;
          controller.enqueue(sse("step_done", { id: step.id, status: "success", result }));
        } catch (err) {
          totalFailed++;
          controller.enqueue(sse("step_done", {
            id: step.id, status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          }));
        }
      }

      controller.enqueue(sse("complete", { totalSucceeded, totalFailed, total: steps.length }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
