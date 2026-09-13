// Direct phone-only parent login has been disabled for security reasons.
// Parents must use the OTP flow (parent-otp-send + parent-otp-verify) to
// prove possession of the phone number before a session is issued.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error: "Direct parent login is disabled. Please verify your phone number with an OTP code.",
      code: "otp_required",
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
