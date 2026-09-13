import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    const cleanPhone = String(phone || "").replace(/\s+/g, "").trim();
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 16) {
      throw new Error("Invalid phone number");
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: linkedStudents } = await admin
      .from("students")
      .select("id, full_name")
      .or(`parent_mobile.eq.${cleanPhone},parent_father_mobile.eq.${cleanPhone},parent_mother_mobile.eq.${cleanPhone},guardian_mobile.eq.${cleanPhone}`);

    if (!linkedStudents || linkedStudents.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "If a student is linked to this number, an OTP has been sent." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin.from("parent_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", cleanPhone).gte("created_at", tenMinAgo);
    if ((count || 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many OTP requests. Please wait." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${cleanPhone}:${code}`));
    const codeHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    await admin.from("parent_otp_codes").insert({ phone: cleanPhone, code: codeHash });

    // TODO: integrate SMS provider. Code is intentionally kept server-side.
    console.log(`[parent-otp-send] Phone ${cleanPhone} → OTP generated (linked students: ${linkedStudents.length})`);

    return new Response(JSON.stringify({
      success: true,
      message: "OTP sent",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
