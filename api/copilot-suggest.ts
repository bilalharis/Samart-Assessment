// api/copilot-suggest.ts

// You can change the model here if you want.
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

// (Optional) very light CORS for safety if you ever call from another origin
function applyCors(req: any, res: any) {
  const origin = String(req.headers.origin || '');
  const allow =
    origin.endsWith('.vercel.app') || origin.includes('samart-assessment.vercel.app');

  if (allow) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });

  try {
    const { question, summary = {} } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing "question"' });
    }

    // >>> THIS is the prompt you asked about <<<
    const prompt = [
      'ROLE: You are a school AI helper.',
      'INSTRUCTIONS:',
      '- Read the JSON CONTEXT.',
      '- Answer ONLY the USER QUESTION.',
      '- If the question asks for suggestions/advice/plan, give 5–7 short, practical bullet points.',
      '- Keep language simple.',
      '',
      'CONTEXT (JSON):',
      JSON.stringify(summary, null, 2),
      '',
      'USER QUESTION:',
      question
    ].join('\n');

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        temperature: 0.2,
        max_output_tokens: 500
      }),
    });

    // Read safely (avoid “Unexpected end of JSON”)
    const ct = r.headers.get('content-type') || '';
    const raw = await r.text();
    const j = ct.includes('application/json') ? JSON.parse(raw || '{}') : { error: raw };

    if (!r.ok) {
      let msg = j?.error?.message || 'OpenAI error';
      if (/incorrect api key|invalid api key|401/i.test(msg)) {
        msg = 'OpenAI rejected the API key (401). Check the key in Vercel Production env.';
      } else if (r.status === 429 || /quota|rate|exceeded/i.test(msg)) {
        msg = 'OpenAI quota/limit reached (429). Add billing or raise limits in your OpenAI project.';
      }
      return res.status(r.status).json({ error: msg });
    }

    // Different SDKs/versions return slightly different shapes. Handle both.
    const text =
      j.output_text ||
      (j.output && j.output[0]?.content?.[0]?.text) ||
      (Array.isArray(j.choices) && j.choices[0]?.message?.content) ||
      'No suggestions available right now.';

    return res.status(200).json({ ok: true, suggestions: String(text) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}




