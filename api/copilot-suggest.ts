// api/copilot-suggest.ts

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function applyCors(req: any, res: any) {
  const origin = String(req.headers.origin || '');
  // allow your Vercel preview + prod; add your custom domain here if you add one
  const allow =
    origin.endsWith('.vercel.app') || origin === 'https://samart-assessment.vercel.app';

  if (allow) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
    }

    const { question, summary = {} } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing "question"' });
    }

    // Optional: log last 4 for debugging; remove after you confirm on Vercel
    console.log('Copilot using OPENAI_API_KEY ending with:', apiKey.slice(-4));

    const prompt = [
      'You are a school AI assistant.',
      'Give short, clear, practical steps for teachers or principals.',
      'Use bullet points. Keep it simple.',
      '',
      'Context (JSON):',
      JSON.stringify(summary, null, 2),
      '',
      'User question:',
      question,
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
        temperature: 0.4,
      }),
    });

    const j = await r.json();
    if (!r.ok) {
      // OpenAI often returns helpful error messages here
      return res.status(r.status).json({ error: j?.error?.message || 'OpenAI error' });
    }

    const text =
      j.output_text ||
      (j.output && j.output[0] && j.output[0].content && j.output[0].content[0] && j.output[0].content[0].text) ||
      'No suggestions available right now.';

    return res.status(200).json({ ok: true, suggestions: text });
  } catch (err: any) {
    console.error('copilot-suggest error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
console.log('ENV=', process.env.VERCEL_ENV, 'OPENAI last4=', (process.env.OPENAI_API_KEY || '').slice(-4));



