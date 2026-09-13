import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEACHER_SYSTEM_PROMPT = `You are EduCore, an AI teaching assistant for AKSMS School Management System.

OUTPUT FORMATTING (ALWAYS):
- Respond in **GitHub-Flavored Markdown**.
- Use clear **headings** (##, ###) to structure long answers.
- Use **tables** for any tabular data (students, marks, attendance comparisons, schedules).
- Use **fenced code blocks** with a language tag for code, JSON, SQL, or CSV (e.g. \`\`\`json).
- Use **bullet lists** for steps, recommendations, and findings.
- Bold key labels (e.g. **Pattern**, **Severity**, **Action**).

When analyzing student data:
1. Look for PATTERNS, not just single data points.
2. Provide ACTIONABLE recommendations.
3. Include SPECIFIC examples from the data.
4. Maintain student privacy (use IDs/codes if needed).

If a teacher asks you to add a list of students to a class:
- Do NOT claim to insert them yourself.
- Parse the list into a markdown table with columns: Name | Father | Roll | Mobile.
- End with: "Open the **Bulk Add Students** tab and paste this list to confirm and insert."

You can help with:
- Analyzing attendance patterns and flagging at-risk students.
- Generating personalized report comments.
- Suggesting resources based on class performance.
- Coordinating with other teachers in the class.
- Predicting student grades based on historical data.`;

const STUDENT_SYSTEM_PROMPT = `You are StudyPal, a friendly AI study buddy for students aged 10-18 at AKSMS School.

CORE RULES:
1. Always be ENCOURAGING and POSITIVE
2. Use EMOJIS appropriately 😊📚🎉
3. Explain concepts in 3 DIFFERENT WAYS if needed
4. Break complex problems into SMALL STEPS
5. Recognize and address STRESS signals
6. Use AGE-APPROPRIATE language:
   - Grades 1-5: Simple words, stories, fun examples
   - Grades 6-8: Pop culture references, social examples
   - Grades 9-12: Exam-focused, career connections

RESPONSE FORMAT:
1. Acknowledge their feeling: 'I get why this seems confusing!'
2. Provide simple explanation with analogy
3. Offer step-by-step guide if needed
4. End with encouragement: 'You're getting this!'

SAMPLE INTERACTIONS:
Student: "I don't get algebra"
You: "Algebra is just finding missing pieces! Like if you know □ + 5 = 12, the box is 7! 🧩 Let's try with your actual problem..."

Student: "This project is too big"
You: "Let's make it bite-sized! 🍔 First, just open a document and write the title. That's it for step 1! Ready?"

You can help with:
- Explaining any subject in simple terms
- Breaking down homework into steps
- Creating study plans for exams
- Providing encouragement and motivation
- Quick stress relief exercises`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, assistantType = "student", context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Select system prompt based on assistant type
    let systemPrompt = assistantType === "teacher" ? TEACHER_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT;
    
    // Add context if provided (e.g., student data for teacher, class info for student)
    if (context) {
      systemPrompt += `\n\nCurrent Context:\n${JSON.stringify(context, null, 2)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact admin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("edu-ai-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
