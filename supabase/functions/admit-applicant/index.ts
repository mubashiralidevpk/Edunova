import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

interface AdmitRequest {
  applicant_id: string;
}

function sanitizeNamePart(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || "student";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Verify caller is admin or admission manager
    const { data: roleRow } = await userClient
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const { data: profile } = await userClient
      .from("profiles").select("staff_role,school_id").eq("user_id", user.id).maybeSingle();
    const isAdmin = roleRow?.role === "admin";
    const isAdmissionMgr = profile?.staff_role === "Admission Manager";
    if (!isAdmin && !isAdmissionMgr) throw new Error("Not authorized to admit applicants");

    const body = await req.json() as AdmitRequest;
    const applicantId = (body?.applicant_id ?? "").trim();
    if (!applicantId || applicantId.length > 100) throw new Error("Invalid applicant_id");

    // Step 1: run the existing SQL RPC to create the student row + assign class
    const { data: newStudentId, error: rpcError } = await userClient
      .rpc("admit_applicant", { _applicant_id: applicantId });
    if (rpcError) throw new Error(`Admission failed: ${rpcError.message}`);

    // Step 2: as service role, fetch the student + class to build credentials
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: student, error: stuErr } = await adminClient
      .from("students")
      .select("id, full_name, roll_number, class_id, school_id, user_id, login_email")
      .eq("id", newStudentId)
      .single();
    if (stuErr || !student) throw new Error("Student record not found after admission");

    // If somehow already has a user, return existing creds
    if (student.user_id && student.login_email) {
      return new Response(
        JSON.stringify({
          success: true,
          student_id: student.id,
          credentials: { email: student.login_email, password: "aksmsb" },
          already_existed: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: cls } = await adminClient
      .from("classes").select("level,section").eq("id", student.class_id).maybeSingle();

    const levelPart = String(cls?.level ?? "0").toLowerCase().replace(/\s+/g, "");
    const sectionPart = (cls?.section ?? "a").toString().trim().toLowerCase().replace(/\s+/g, "");
    const namePart = sanitizeNamePart(student.full_name);
    const rollPart = sanitizeNamePart(student.roll_number);
    const password = "aksmsb";

    // Build a globally unique email — retry up to 5 times on collision
    let finalEmail = "";
    let createdUserId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = crypto.getRandomValues(new Uint8Array(3))
        .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "")
        .slice(0, 6);
      const candidate = `${namePart}.${rollPart}.${levelPart}${sectionPart}.${suffix}@aks.school.app`;

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: candidate,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: student.full_name,
          role: "student",
          school_id: student.school_id,
        },
      });
      if (!createErr && created?.user) {
        finalEmail = candidate;
        createdUserId = created.user.id;
        break;
      }
      // If the error is a duplicate email collision, retry; otherwise bubble up.
      if (createErr && !/already.*registered|duplicate|exists/i.test(createErr.message)) {
        throw new Error(`Failed to create student auth user: ${createErr.message}`);
      }
    }
    if (!createdUserId || !finalEmail) {
      throw new Error("Could not generate a unique email after multiple attempts");
    }

    // Step 3: link the new auth user back to the student row
    const { error: updErr } = await adminClient
      .from("students")
      .update({
        user_id: createdUserId,
        login_email: finalEmail,
        password_text: password,
      })
      .eq("id", student.id);

    if (updErr) {
      // Roll back the auth user to avoid orphans
      await adminClient.auth.admin.deleteUser(createdUserId);
      throw new Error(`Failed to link auth user to student: ${updErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        student_id: student.id,
        credentials: { email: finalEmail, password },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("admit-applicant error:", error?.message);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
