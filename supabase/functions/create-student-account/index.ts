import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateStudentRequest {
  fullName: string;
  rollNumber: string;
  studentId?: string;
  classId: string;
  classLevel?: number | string;
  className?: string;
  section?: string;
  parentMobile?: string;
  parentEmail?: string;
  // Optional admission-style fields (collected by upgraded Add Student dialog)
  dateOfBirth?: string;
  gender?: string;
  bFormNumber?: string;
  address?: string;
  emergencyContact?: string;
  parentFatherName?: string;
  parentFatherNic?: string;
  parentMotherName?: string;
  parentMotherNic?: string;
  parentMotherMobile?: string;
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max accounts per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count++;
  return true;
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

    // Allow teachers and admins to create student accounts
    const { data: roleData } = await userClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roleData || (roleData.role !== "teacher" && roleData.role !== "admin")) {
      throw new Error("Only teachers and admins can create student accounts");
    }

    // Get caller's school
    const { data: callerProfile } = await userClient
      .from("profiles").select("school_id").eq("user_id", user.id).maybeSingle();
    const callerSchoolId = callerProfile?.school_id ?? null;

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 10 student accounts per hour." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: CreateStudentRequest = await req.json();
    const {
      fullName, rollNumber, studentId, classId, parentMobile, parentEmail,
      dateOfBirth, gender, bFormNumber, address, emergencyContact,
      parentFatherName, parentFatherNic, parentMotherName, parentMotherNic, parentMotherMobile,
    } = body;

    if (!fullName?.trim() || !rollNumber?.trim() || !classId?.trim()) {
      throw new Error("Missing required fields: fullName, rollNumber, classId");
    }

    // Validate input lengths
    if (fullName.trim().length > 200 || rollNumber.trim().length > 50 || classId.trim().length > 100) {
      throw new Error("Input fields exceed maximum allowed length");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch authoritative class info so emails are always unique per class
    const { data: classRow, error: classError } = await adminClient
      .from("classes").select("level, section, school_id").eq("id", classId).maybeSingle();
    if (classError || !classRow) throw new Error("Class not found");
    // Tenant isolation: the class must belong to the caller's own school
    if (!callerSchoolId || classRow.school_id !== callerSchoolId) {
      throw new Error("Class not found");
    }

    const levelPart = String(classRow.level ?? '0').toLowerCase().replace(/\s+/g, '');
    const sectionPart = (classRow.section ?? 'a').toString().trim().toLowerCase().replace(/\s+/g, '');
    const rollPart = rollNumber.trim().toLowerCase().replace(/\s+/g, '');
    const namePart = (fullName.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 20)) || 'student';

    // Hybrid email: friendly prefix + 4-char random suffix → guaranteed globally unique across schools
    // Example: mubashirali.1.6b.a3f9@aks.school.app
    const randomSuffix = Math.random().toString(36).slice(2, 6).toLowerCase();
    const generatedEmail = `${namePart}.${rollPart}.${levelPart}${sectionPart}.${randomSuffix}@aks.school.app`;
    const defaultPassword = "aksmsb";

    // Auto-generate globally unique studentId
    const finalStudentId = studentId?.trim() ||
      `STU-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    // Defensive: still check collision (extremely unlikely with random suffix).
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === generatedEmail);
    const finalEmail = emailExists
      ? `${namePart}.${rollPart}.${levelPart}${sectionPart}.${Math.random().toString(36).slice(2,8)}@aks.school.app`
      : generatedEmail;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: finalEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "student",
        school_id: callerSchoolId,
      },
    });

    if (createError) throw new Error(`Failed to create user account: ${createError.message}`);

    // Explicit account setup so the student always has a school + role.
    const { error: stuProfileErr } = await adminClient.from("profiles").upsert({
      user_id: newUser.user.id,
      full_name: fullName.trim(),
      email: finalEmail,
      school_id: callerSchoolId,
    }, { onConflict: "user_id" });
    if (stuProfileErr) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to set up the student account: ${stuProfileErr.message}`);
    }
    const { error: stuRoleErr } = await adminClient.from("user_roles")
      .upsert({ user_id: newUser.user.id, role: "student" }, { onConflict: "user_id,role" });
    if (stuRoleErr) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to give the student access: ${stuRoleErr.message}`);
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .insert({
        full_name: fullName.trim(),
        roll_number: rollNumber.trim(),
        student_id: finalStudentId,
        class_id: classId,
        user_id: newUser.user.id,
        created_by: user.id,
        password_text: defaultPassword,
        parent_mobile: parentMobile?.trim() || null,
        parent_email: parentEmail?.trim() || null,
        school_id: callerSchoolId,
        login_email: finalEmail,
        date_of_birth: dateOfBirth || null,
        gender: gender?.trim() || null,
        b_form_number: bFormNumber?.trim() || null,
        address: address?.trim() || null,
        emergency_contact: emergencyContact?.trim() || null,
        parent_father_name: parentFatherName?.trim() || null,
        parent_father_nic: parentFatherNic?.trim() || null,
        parent_mother_name: parentMotherName?.trim() || null,
        parent_mother_nic: parentMotherNic?.trim() || null,
        parent_mother_mobile: parentMotherMobile?.trim() || null,
      })
      .select()
      .single();

    if (studentError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to create student record: ${studentError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        student,
        credentials: { email: finalEmail, password: defaultPassword },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-student-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
