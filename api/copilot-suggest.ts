// api/copilot-suggest.ts
// No @vercel/node import needed. Works on Vercel and local (vercel dev).

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"; // you can keep gpt-4o-mini if you prefer

export default async function handler(req: any, res: any) {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY is missing" });

    // Body can be object or string; handle both
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { summary, question } = body as { summary?: any; question?: string };

    if (!question) return res.status(400).json({ error: "question is required" });

    // Keep it short and useful
    const system =
      "You are Smart Assessment’s improvement copilot for a school principal. " +
      "Use only the provided metrics. Reply under three sections: " +
      "Short-term (this week), Medium-term (this term), Long-term (this year). " +
      "Give clear, measurable tips. Keep it under 250 words.";

    const input =
      `SYSTEM:\n${system}\n\n` +
      `USER QUESTION:\n${question}\n\n` +
      `METRICS JSON:\n${JSON.stringify(summary ?? {}, null, 2)}`;

    // Use Responses API (simple and stable)
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        temperature: 0.4,
      }),
    });

    const j = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: j?.error?.message || "OpenAI error" });
    }

    const text =
      j.output_text ??
      j?.output?.[0]?.content?.[0]?.text ??
      "No suggestions available right now.";

    // Keep the same field your UI already expects
    return res.status(200).json({ suggestions: text, ok: true });
  } catch (err: any) {
    console.error("copilot-suggest error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}

