// /api/copilot-suggest.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL = 'gpt-4o-mini'; // fast & good for suggestions

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    const { summary, question } = req.body as { summary: any; question: string };

    // Guardrails
    if (!summary || typeof question !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // ✅ System prompt: tell the model to be concise, actionable, and data-aware
    const system = [
      'You are Smart Assessment’s improvement copilot for a school principal.',
      'Use the provided metrics ONLY (do not invent data).',
      'Return clear, actionable suggestions grouped by Short-term (this week), Medium-term (this term), and Long-term (this year).',
      'Where possible, include measurable KPIs and small implementation checklists.',
      'Tone: helpful, decisive, professional. Bullet points are welcome. Keep it under 250 words.',
    ].join(' ');

    // 🔐 Don’t ship raw PII if you don’t need it. summary below should already be anonymized or aggregated.
    const user = `
QUESTION: ${question}

METRICS JSON:
${JSON.stringify(summary, null, 2)}
    `;

    // Call OpenAI (chat completions)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: text || 'Upstream error' });
    }

    const data = await resp.json();
    const text: string =
      data?.choices?.[0]?.message?.content?.trim() ?? 'No suggestions available right now.';

    return res.status(200).json({ suggestions: text });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
