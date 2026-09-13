import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Identify the caller from the JWT (verify_jwt=true is set in config).
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    // 2) Admin client for privileged reads/writes (still scoped by us to caller's school).
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3) Resolve caller's school + role server-side. Never trust client.
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("user_id", callerId)
      .maybeSingle();
    const callerSchoolId = callerProfile?.school_id as string | undefined;
    if (!callerSchoolId) return json({ error: "No school assigned" }, 403);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const callerRoles = new Set((roleRows ?? []).map((r: any) => r.role));
    const isAdmin = callerRoles.has("admin");
    const isTeacher = callerRoles.has("teacher");

    const { action, data } = await req.json();

    // Helper: load an impact and verify same-school ownership.
    async function loadImpactInSchool(impactId: string) {
      const { data: impact } = await supabase
        .from("class_impacts")
        .select("*, classes:class_id(class_name, subject, school_id)")
        .eq("id", impactId)
        .maybeSingle();
      if (!impact) return null;
      const impactSchool = impact.school_id ?? impact.classes?.school_id;
      if (impactSchool !== callerSchoolId) return null;
      return impact;
    }

    switch (action) {
      case "calculate_impact": {
        if (!isAdmin) return json({ error: "Forbidden" }, 403);

        const today = new Date().toISOString().split("T")[0];
        const dayOfWeek = new Date().getDay();

        // Only schedules whose class belongs to the caller's school.
        const { data: todaySchedules } = await supabase
          .from("teacher_schedules")
          .select("*, classes:class_id!inner(id, class_name, subject, section, school_id)")
          .eq("day_of_week", dayOfWeek)
          .eq("classes.school_id", callerSchoolId);

        if (!todaySchedules || todaySchedules.length === 0) {
          return json({ impacts: [], message: "No schedules for today" });
        }

        // Only check-ins for teachers belonging to caller's school.
        const { data: schoolTeacherProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("school_id", callerSchoolId);
        const schoolTeacherIds = new Set((schoolTeacherProfiles ?? []).map((p: any) => p.user_id));

        const { data: checkins } = await supabase
          .from("teacher_checkins")
          .select("teacher_id")
          .eq("date", today)
          .in("teacher_id", Array.from(schoolTeacherIds));

        const checkedInTeachers = new Set((checkins || []).map((c: any) => c.teacher_id));

        const absentTeacherSchedules = todaySchedules.filter(
          (s: any) => schoolTeacherIds.has(s.teacher_id) && !checkedInTeachers.has(s.teacher_id),
        );
        const absentTeacherIds = [...new Set(absentTeacherSchedules.map((s: any) => s.teacher_id))];

        if (absentTeacherIds.length === 0) {
          return json({ impacts: [], message: "All teachers checked in" });
        }

        const profileMap = new Map(
          (schoolTeacherProfiles ?? []).map((p: any) => [p.user_id, p]),
        );

        const impacts: any[] = [];
        for (const schedule of absentTeacherSchedules) {
          const { data: existing } = await supabase
            .from("class_impacts")
            .select("id")
            .eq("date", today)
            .eq("teacher_id", schedule.teacher_id)
            .eq("class_id", schedule.class_id)
            .eq("period", schedule.period)
            .maybeSingle();

          if (!existing) {
            const { data: impact } = await supabase
              .from("class_impacts")
              .insert({
                date: today,
                teacher_id: schedule.teacher_id,
                class_id: schedule.class_id,
                school_id: callerSchoolId,
                period: schedule.period,
                subject: schedule.subject || schedule.classes?.subject,
                time_slot: `${schedule.start_time}-${schedule.end_time}`,
                status: "impacted",
              })
              .select()
              .single();
            if (impact) impacts.push(impact);
          }
        }

        // Notify only teachers and admins of the caller's school.
        const { data: schoolUserRoles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["teacher", "admin"])
          .in("user_id", Array.from(schoolTeacherIds));

        const notifications = (schoolUserRoles || []).map((t: any) => ({
          recipient_id: t.user_id,
          recipient_role: t.role,
          title: "⚠️ Class Impact Alert",
          message: `${absentTeacherIds.length} teacher(s) not checked in. ${impacts.length} class(es) impacted.`,
          notification_type: "alert",
          related_entity_type: "class_impact",
        }));
        if (notifications.length > 0) {
          await supabase.from("system_notifications").insert(notifications);
        }

        for (const teacherId of absentTeacherIds) {
          const profile = profileMap.get(teacherId);
          await supabase.from("alert_logs").insert({
            alert_type: "system",
            recipient_id: teacherId,
            school_id: callerSchoolId,
            title: "Absence Alert",
            message: `Teacher ${profile?.full_name || "Unknown"} has not checked in by cutoff time.`,
            delivery_status: "sent",
            related_entity_type: "class_impact",
          });
        }

        return json({
          impacts,
          absent_teachers: absentTeacherIds.map((id) => ({ id, ...profileMap.get(id) })),
          message: `${impacts.length} class impacts created`,
        });
      }

      case "volunteer_replacement": {
        if (!isTeacher && !isAdmin) return json({ error: "Forbidden" }, 403);
        const { impact_id } = data ?? {};
        if (!impact_id) return json({ error: "impact_id required" }, 400);

        const impact = await loadImpactInSchool(impact_id);
        if (!impact) return json({ error: "Not found" }, 404);

        const { data: updated, error } = await supabase
          .from("class_impacts")
          .update({
            substitute_teacher_id: callerId, // identity from JWT, not client
            status: "volunteer_pending",
          })
          .eq("id", impact_id)
          .eq("school_id", impact.school_id ?? callerSchoolId)
          .select("*, classes:class_id(class_name, subject)")
          .single();
        if (error) throw error;

        const { data: volunteerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", callerId)
          .maybeSingle();

        // Notify admins in the same school only.
        const { data: schoolProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("school_id", callerSchoolId);
        const schoolUserIds = (schoolProfiles ?? []).map((p: any) => p.user_id);
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .in("user_id", schoolUserIds);

        const adminNotifs = (admins || []).map((a: any) => ({
          recipient_id: a.user_id,
          recipient_role: "admin",
          title: "🔄 Replacement Volunteer",
          message: `${volunteerProfile?.full_name ?? "A teacher"} volunteered to cover ${updated?.classes?.class_name} Period ${updated?.period}. Approval needed.`,
          notification_type: "replacement",
          related_entity_type: "class_impact",
          related_entity_id: impact_id,
        }));
        if (adminNotifs.length > 0) {
          await supabase.from("system_notifications").insert(adminNotifs);
        }

        return json({ success: true, impact: updated });
      }

      case "approve_replacement": {
        if (!isAdmin) return json({ error: "Forbidden" }, 403);
        const { impact_id, remarks } = data ?? {};
        if (!impact_id) return json({ error: "impact_id required" }, 400);

        const impact = await loadImpactInSchool(impact_id);
        if (!impact) return json({ error: "Not found" }, 404);

        const { data: updated, error } = await supabase
          .from("class_impacts")
          .update({
            status: "replacement_approved",
            approved_by: callerId,
            approved_at: new Date().toISOString(),
            admin_remarks: remarks ?? null,
          })
          .eq("id", impact_id)
          .eq("school_id", impact.school_id ?? callerSchoolId)
          .select("*, classes:class_id(class_name, subject)")
          .single();
        if (error) throw error;

        if (updated?.substitute_teacher_id) {
          await supabase.from("system_notifications").insert({
            recipient_id: updated.substitute_teacher_id,
            recipient_role: "teacher",
            title: "✅ Replacement Approved",
            message: `You've been approved to cover ${updated.classes?.class_name} Period ${updated.period}.`,
            notification_type: "replacement",
            related_entity_type: "class_impact",
            related_entity_id: impact_id,
          });
        }

        const { data: classStudents } = await supabase
          .from("students")
          .select("user_id")
          .eq("class_id", updated?.class_id)
          .eq("school_id", callerSchoolId)
          .not("user_id", "is", null);

        const studentNotifs = (classStudents || [])
          .filter((s: any) => s.user_id)
          .map((s: any) => ({
            recipient_id: s.user_id,
            recipient_role: "student",
            title: "📢 Substitute Teacher Assigned",
            message: `A substitute teacher has been assigned for Period ${updated?.period}.`,
            notification_type: "info",
            related_entity_type: "class_impact",
            related_entity_id: impact_id,
          }));
        if (studentNotifs.length > 0) {
          await supabase.from("system_notifications").insert(studentNotifs);
        }

        return json({ success: true, impact: updated });
      }

      case "admin_review_checkin": {
        if (!isAdmin) return json({ error: "Forbidden" }, 403);
        const { checkin_id, new_status, remarks } = data ?? {};
        if (!checkin_id || !new_status) return json({ error: "checkin_id and new_status required" }, 400);

        // Verify the check-in belongs to a teacher in caller's school.
        const { data: checkin } = await supabase
          .from("teacher_checkins")
          .select("id, status, teacher_id")
          .eq("id", checkin_id)
          .maybeSingle();
        if (!checkin) return json({ error: "Not found" }, 404);

        const { data: teacherProfile } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("user_id", checkin.teacher_id)
          .maybeSingle();
        if (teacherProfile?.school_id !== callerSchoolId) return json({ error: "Forbidden" }, 403);

        const { error } = await supabase
          .from("teacher_checkins")
          .update({
            original_status: checkin.status,
            status: new_status,
            admin_remarks: remarks ?? null,
            reviewed_by: callerId,
            reviewed_at: new Date().toISOString(),
            is_locked: true,
          })
          .eq("id", checkin_id);
        if (error) throw error;

        return json({ success: true });
      }

      case "ai_suggest_replacement": {
        if (!isAdmin && !isTeacher) return json({ error: "Forbidden" }, 403);
        const { impact_id } = data ?? {};
        if (!impact_id) return json({ error: "impact_id required" }, 400);

        const impact = await loadImpactInSchool(impact_id);
        if (!impact) return json({ error: "Not found" }, 404);

        const today = new Date().toISOString().split("T")[0];
        const dayOfWeek = new Date().getDay();

        // Restrict pool to teachers in the same school.
        const { data: schoolProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("school_id", callerSchoolId);
        const schoolTeacherIds = (schoolProfiles ?? []).map((p: any) => p.user_id);

        const { data: checkedInTeachers } = await supabase
          .from("teacher_checkins")
          .select("teacher_id")
          .eq("date", today)
          .in("status", ["present", "late"])
          .in("teacher_id", schoolTeacherIds);
        const checkedInIds = (checkedInTeachers || []).map((c: any) => c.teacher_id);

        const { data: busySchedules } = await supabase
          .from("teacher_schedules")
          .select("teacher_id")
          .eq("day_of_week", dayOfWeek)
          .eq("period", impact.period)
          .in("teacher_id", schoolTeacherIds);
        const busyIds = new Set((busySchedules || []).map((s: any) => s.teacher_id));

        const freeTeacherIds = checkedInIds.filter(
          (id: string) => !busyIds.has(id) && id !== impact.teacher_id,
        );

        const freeProfiles = (schoolProfiles ?? []).filter((p: any) =>
          freeTeacherIds.includes(p.user_id),
        );

        const { data: subjectTeachers } = await supabase
          .from("teacher_schedules")
          .select("teacher_id")
          .in("teacher_id", freeTeacherIds)
          .ilike("subject", `%${impact.classes?.subject || ""}%`);
        const subjectMatchIds = new Set((subjectTeachers || []).map((s: any) => s.teacher_id));

        const suggestions = freeProfiles
          .map((p: any) => ({
            ...p,
            subject_match: subjectMatchIds.has(p.user_id),
            score: subjectMatchIds.has(p.user_id) ? 100 : 50,
          }))
          .sort((a: any, b: any) => b.score - a.score);

        return json({ suggestions: suggestions.slice(0, 5), impact });
      }

      case "get_daily_summary": {
        if (!isAdmin && !isTeacher) return json({ error: "Forbidden" }, 403);
        const today = data?.date || new Date().toISOString().split("T")[0];
        const dayOfWeek = new Date(today).getDay();

        const { data: schoolProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("school_id", callerSchoolId);
        const schoolTeacherIds = (schoolProfiles ?? []).map((p: any) => p.user_id);

        const { data: checkins } = await supabase
          .from("teacher_checkins")
          .select("*")
          .eq("date", today)
          .in("teacher_id", schoolTeacherIds);

        const { data: impacts } = await supabase
          .from("class_impacts")
          .select("*, classes:class_id(class_name, subject)")
          .eq("date", today)
          .eq("school_id", callerSchoolId);

        const { data: schedules } = await supabase
          .from("teacher_schedules")
          .select("teacher_id")
          .eq("day_of_week", dayOfWeek)
          .in("teacher_id", schoolTeacherIds);

        const expectedTeachers = new Set((schedules || []).map((s: any) => s.teacher_id));
        const checkedIn = new Set((checkins || []).map((c: any) => c.teacher_id));
        const notCheckedIn = [...expectedTeachers].filter((id) => !checkedIn.has(id));

        return json({
          date: today,
          total_expected: expectedTeachers.size,
          checked_in: checkedIn.size,
          not_checked_in: notCheckedIn.length,
          on_time: (checkins || []).filter((c: any) => c.arrival_status === "on_time").length,
          late: (checkins || []).filter((c: any) => c.status === "late").length,
          total_impacts: (impacts || []).length,
          resolved_impacts: (impacts || []).filter(
            (i: any) => i.status === "replacement_approved" || i.status === "resolved",
          ).length,
          checkins,
          impacts,
        });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("checkin-impact-engine error:", message);
    return json({ error: message }, 500);
  }
});
