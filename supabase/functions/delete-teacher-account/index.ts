import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Only school admins can remove teachers");

    const { data: mySchool } = await userClient.rpc("get_user_school", { _user_id: user.id });
    if (!mySchool) throw new Error("Your account has no school assigned");

    const body = await req.json().catch(() => ({}));
    const teacherId = String(body?.teacherUserId || "");
    if (!/^[0-9a-f-]{36}$/i.test(teacherId)) throw new Error("A valid teacher is required");
    if (teacherId === user.id) throw new Error("You cannot delete your own account");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: target } = await admin.from("profiles").select("user_id, school_id, full_name").eq("user_id", teacherId).maybeSingle();
    if (!target) throw new Error("Teacher profile not found");
    if (target.school_id !== mySchool) throw new Error("This teacher is not in your school");

    const { data: school } = await admin.from("schools").select("owner_admin_id").eq("id", mySchool).maybeSingle();
    if (school?.owner_admin_id === teacherId) throw new Error("The school owner account cannot be deleted");

    // Release owned classes so class data is never orphaned
    await admin.from("classes").update({ teacher_id: user.id }).eq("teacher_id", teacherId);
    await admin.from("class_teachers").delete().eq("teacher_id", teacherId);
    await admin.from("staff_role_assignments").delete().eq("user_id", teacherId);
    await admin.from("teacher_invitations").delete().eq("user_id", teacherId);
    await admin.from("user_roles").delete().eq("user_id", teacherId);
    await admin.from("profiles").delete().eq("user_id", teacherId);

    const { error: delErr } = await admin.auth.admin.deleteUser(teacherId);
    if (delErr) throw new Error(`Could not delete the login: ${delErr.message}`);

    return new Response(JSON.stringify({ success: true, deleted: target.full_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error while deleting the teacher";
    console.error("delete-teacher-account error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
