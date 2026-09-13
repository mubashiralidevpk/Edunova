import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, code } = await req.json();
    const cleanPhone = String(phone || "").replace(/\s+/g, "").trim();
    const cleanCode = String(code || "").trim();
    if (!cleanPhone || !cleanCode) throw new Error("Phone and code required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find latest unused, unexpired OTP
    const { data: otps } = await admin.from("parent_otp_codes")
      .select("*").eq("phone", cleanPhone).eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1);

    const otp = otps?.[0];
    if (!otp) throw new Error("OTP expired or not found. Please request a new one.");
    if (otp.attempts >= 5) throw new Error("Too many attempts. Request a new code.");

    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${cleanPhone}:${cleanCode}`));
    const codeHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (otp.code !== codeHash) {
      await admin.from("parent_otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      throw new Error("Invalid OTP code");
    }

    await admin.from("parent_otp_codes").update({ used: true }).eq("id", otp.id);

    // Find linked students for this phone
    const { data: students } = await admin.from("students")
      .select("id, full_name, school_id")
      .or(`parent_mobile.eq.${cleanPhone},parent_father_mobile.eq.${cleanPhone},parent_mother_mobile.eq.${cleanPhone},guardian_mobile.eq.${cleanPhone}`);

    if (!students || students.length === 0) throw new Error("No students linked to this number");

    // Get-or-create parent profile and auth user
    const parentEmail = `parent.${cleanPhone}@aks.parents.local`;
    let userId: string | null = null;

    const { data: existingParent } = await admin.from("parents").select("user_id").eq("phone", cleanPhone).maybeSingle();
    if (existingParent?.user_id) {
      userId = existingParent.user_id;
    } else {
      // Try to find existing auth user
      const { data: usersList } = await admin.auth.admin.listUsers();
      const existing = usersList?.users?.find(u => u.email === parentEmail);
      if (existing) {
        userId = existing.id;
      } else {
        const tempPassword = `OTP-${crypto.randomUUID()}`;
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: parentEmail, password: tempPassword, email_confirm: true,
          user_metadata: { role: "parent", phone: cleanPhone, full_name: `Parent of ${students[0].full_name}` },
        });
        if (createErr) throw createErr;
        userId = newUser.user.id;
      }

      await admin.from("parents").upsert({
        user_id: userId, phone: cleanPhone, email: parentEmail,
        full_name: `Parent of ${students[0].full_name}`,
        phone_verified: true, last_otp_login_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    // Link students
    const { data: parentRow } = await admin.from("parents").select("id").eq("user_id", userId!).single();
    if (parentRow) {
      for (const s of students) {
        await admin.from("parent_students").upsert(
          { parent_id: parentRow.id, student_id: s.id, relationship: "parent", is_primary: true, verified_at: new Date().toISOString() },
          { onConflict: "parent_id,student_id" }
        );
      }
    }

    // Generate one-time login link (magic link) the client can use
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink", email: parentEmail,
    });
    if (linkErr) throw linkErr;

    return new Response(JSON.stringify({
      success: true,
      action_link: linkData.properties?.action_link,
      hashed_token: linkData.properties?.hashed_token,
      email: parentEmail,
      students_count: students.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
