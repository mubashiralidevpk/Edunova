import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STAFF_ROLES = [
  "Staff",
  "Head",
  "Vice Principal",
  "Event Manager",
  "IT Expert",
  "Funds Manager",
  "Admission Manager",
];

interface CreateTeacherRequest {
  fullName: string;
  email: string;
  password: string;
  staffRole?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const [{ data: isAdmin, error: roleErr }, { data: profile, error: profileErr }, { data: ownedSchool, error: schoolErr }] = await Promise.all([
      userClient.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      }),
      userClient.from("profiles").select("school_id").eq("user_id", user.id).maybeSingle(),
      userClient.from("schools").select("id").eq("owner_admin_id", user.id).maybeSingle(),
    ]);

    if (roleErr) {
      throw new Error(`Unable to verify admin access: ${roleErr.message}`);
    }
    if (profileErr) {
      throw new Error(`Unable to read admin profile: ${profileErr.message}`);
    }
    if (schoolErr) {
      throw new Error(`Unable to read school assignment: ${schoolErr.message}`);
    }

    const metadataRole = user.user_metadata?.role;
    const schoolId = profile?.school_id ?? ownedSchool?.id ?? user.user_metadata?.school_id ?? null;

    if (!isAdmin && metadataRole !== "admin" && !ownedSchool?.id) {
      throw new Error("Only school admins can create teacher accounts");
    }
    if (!schoolId) throw new Error("Admin has no school assigned");

    const body: CreateTeacherRequest = await req.json();
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const staffRole = body.staffRole?.trim();

    if (!fullName || !email || !password) throw new Error("fullName, email, password required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    if (staffRole && !ALLOWED_STAFF_ROLES.includes(staffRole)) {
      throw new Error(`Invalid staff role. Allowed: ${ALLOWED_STAFF_ROLES.join(", ")}`);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Duplicate email pre-check via admin auth listUsers (filter)
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const dup = existing?.users?.find((u) => (u.email || "").toLowerCase() === email);
    if (dup) {
      throw new Error("This email is already used. Try another one.");
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "teacher",
        school_id: schoolId,
      },
    });
    if (createErr) {
      const msg = (createErr.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("This email is already used. Try another one.");
      }
      throw new Error(`Failed to create teacher: ${createErr.message}`);
    }

    // The account row is created here explicitly so the teacher always has a
    // school + role, even if the auth signup hook did not run.
    const { error: profileWriteErr } = await admin.from("profiles").upsert({
      user_id: created.user.id,
      full_name: fullName,
      email,
      school_id: schoolId,
      ...(staffRole ? { staff_role: staffRole } : {}),
    }, { onConflict: "user_id" });
    if (profileWriteErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(`Failed to set up the teacher account: ${profileWriteErr.message}`);
    }

    const { error: roleWriteErr } = await admin.from("user_roles")
      .upsert({ user_id: created.user.id, role: "teacher" }, { onConflict: "user_id,role" });
    if (roleWriteErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(`Failed to give the teacher access: ${roleWriteErr.message}`);
    }

    await admin.from("teacher_invitations").insert({
      school_id: schoolId,
      created_by: user.id,
      email,
      full_name: fullName,
      temp_password: password,
      status: "active",
      user_id: created.user.id,
    });

    return new Response(
      JSON.stringify({ success: true, credentials: { email, password } }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("create-teacher-account error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
