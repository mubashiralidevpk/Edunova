import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

async function signed(admin: any, paths: string[]) {
  const out: string[] = [];
  for (const p of paths || []) {
    const { data } = await admin.storage.from("exam-papers").createSignedUrl(p, 600);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}

async function runLayer(
  apiKey: string,
  layerName: string,
  instruction: string,
  questionUrls: string[],
  answerUrls: string[],
  totalMarks: number,
  answerKey: string | null,
) {
  const content: any[] = [
    {
      type: "text",
      text:
        `${instruction}\n\nTotal marks for this paper: ${totalMarks}.` +
        (answerKey ? `\n\nTeacher answer key / marking scheme:\n${answerKey}` : "") +
        `\n\nThe first images (if any) are the QUESTION PAPER. The remaining images are the STUDENT ANSWER SHEET.` +
        `\n\nReply ONLY with strict JSON: {"obtained_marks": number, "confidence": number (0-1), "per_question": [{"q": string, "awarded": number, "max": number, "reason": string}], "summary": string}`,
    },
    ...questionUrls.map((u) => ({ type: "image_url", image_url: { url: u } })),
    ...answerUrls.map((u) => ({ type: "image_url", image_url: { url: u } })),
  ];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a strict, fair exam examiner. Be consistent and never invent answers the student did not write." },
        { role: "user", content },
      ],
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a minute.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace AI credits.");
  if (!res.ok) throw new Error(`AI service error (${res.status})`);

  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "";
  const match = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
  let parsed: any = {};
  try { parsed = match ? JSON.parse(match[0]) : {}; } catch { parsed = {}; }

  return {
    layer: layerName,
    obtained_marks: Number(parsed.obtained_marks ?? 0),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
    per_question: Array.isArray(parsed.per_question) ? parsed.per_question : [],
    summary: String(parsed.summary ?? "").slice(0, 2000),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI is not configured for this workspace");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isExamManager } = await userClient.rpc("is_exam_manager", { _user_id: user.id });
    if (!isExamManager) throw new Error("Only exam managers can run paper checking");

    const { data: mySchool } = await userClient.rpc("get_user_school", { _user_id: user.id });
    if (!mySchool) throw new Error("Your account has no school assigned");

    const body = await req.json().catch(() => ({}));
    const checkId = String(body?.check_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(checkId)) throw new Error("A valid check_id is required");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: check, error: checkErr } = await admin
      .from("exam_paper_checks").select("*").eq("id", checkId).maybeSingle();
    if (checkErr) throw new Error(checkErr.message);
    if (!check) throw new Error("Paper check record not found");
    if (check.school_id !== mySchool) throw new Error("This paper belongs to another school");

    let qpUrls: string[] = [];
    let answerKey: string | null = null;
    let totalMarks = check.total_marks || 100;
    if (check.question_paper_id) {
      const { data: qp } = await admin
        .from("exam_question_papers").select("image_urls, answer_key, total_marks")
        .eq("id", check.question_paper_id).maybeSingle();
      if (qp) {
        qpUrls = await signed(admin, (qp.image_urls as string[]) || []);
        answerKey = qp.answer_key ?? null;
        totalMarks = qp.total_marks || totalMarks;
      }
    }
    const ansUrls = await signed(admin, (check.answer_image_urls as string[]) || []);
    if (ansUrls.length === 0) throw new Error("No readable answer sheet images were found");

    await admin.from("exam_paper_checks").update({ status: "checking" }).eq("id", checkId);

    const layerSpecs = [
      ["layer_1_transcribe", "LAYER 1 — Read every question and the student's handwritten answer carefully. Grade generously but accurately, question by question."],
      ["layer_2_strict", "LAYER 2 — Independently re-grade the same paper as a strict examiner. Penalise incomplete working and wrong units. Do not look at any previous grading."],
      ["layer_3_audit", "LAYER 3 — Act as a moderation examiner. Re-check the paper for missed answers, pages answered out of order, and arithmetic errors in totalling. Produce the final fair mark."],
    ] as const;

    const layers: any[] = [];
    for (const [name, instruction] of layerSpecs) {
      layers.push(await runLayer(apiKey, name, instruction, qpUrls, ansUrls, totalMarks, answerKey));
    }

    const marks = layers.map((l) => l.obtained_marks);
    const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
    const spread = Math.max(...marks) - Math.min(...marks);
    const agreement = totalMarks > 0 ? Math.max(0, 1 - spread / totalMarks) : 0;
    const confidence = layers.reduce((a, l) => a + l.confidence, 0) / layers.length;
    const finalMarks = Math.round(Math.max(0, Math.min(totalMarks, (avg + layers[2].obtained_marks) / 2)));
    const needsReview = agreement < 0.9 || confidence < 0.7;

    const { error: upErr } = await admin.from("exam_paper_checks").update({
      status: "checked",
      layers,
      per_question: layers[2].per_question,
      obtained_marks: finalMarks,
      total_marks: totalMarks,
      confidence: Number(confidence.toFixed(2)),
      agreement: Number(agreement.toFixed(2)),
      needs_review: needsReview,
      ai_summary: layers[2].summary || layers[0].summary,
    }).eq("id", checkId);
    if (upErr) throw new Error(upErr.message);

    return new Response(
      JSON.stringify({ success: true, obtained_marks: finalMarks, total_marks: totalMarks, agreement, confidence, needs_review: needsReview }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error while checking the paper";
    console.error("check-exam-paper error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
