// src/components/copilot/logic.ts
// export type CopilotContext = Record<string, any>;

// export async function askCopilot(question: string, context?: CopilotContext) {
//   const res = await fetch('/api/copilot-suggest', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ question, summary: context ?? {} }),
//   });

//   // If API is missing or CORS blocked, this prevents "Unexpected end of JSON"
//   const ct = res.headers.get('content-type') || '';
//   const bodyText = await res.text();
//   const data = ct.includes('application/json') ? JSON.parse(bodyText || '{}') : { error: bodyText };

//   if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
//   return data.suggestions as string;
// }

//its good

// src/components/copilot/logic.ts
export type CopilotContext = Record<string, any>;

/** Call server to get AI suggestions */
export async function askCopilot(question: string, context?: CopilotContext) {
  const res = await fetch('/api/copilot-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, summary: context ?? {} }),
  });

  const ct = res.headers.get('content-type') || '';
  const bodyText = await res.text();
  let data: any = {};
  try {
    data = ct.includes('application/json') ? JSON.parse(bodyText || '{}') : { error: bodyText };
  } catch {
    data = { error: bodyText };
  }

  if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  return (data.suggestions as string) ?? '';
}

/** Greeting / very short query -> send to AI */
export function isGreeting(q: string) {
  const s = q.toLowerCase().trim();
  if (!s) return false;
  const greet = /^(hi|hello|hey|salam|assalam|assalamu|aoa|help|start|menu)\b/.test(s);
  const veryShort = s.split(/\s+/).filter(Boolean).length <= 2; // "hi", "help", "improve?"
  return greet || veryShort;
}

/** Looks like a data lookup? -> answer from app */
function looksLikeDataQuery(q: string) {
  const s = q.toLowerCase();
  return (
    /overall|average|attendance|best subject|weak|top|bottom|rank|grade|class\s*\d|class|section|teacher|student|subject|score|result|summary|list/.test(
      s
    ) ||
    /how\s+is|show|list|what\s+is\s+(the\s+)?(average|score|summary)/.test(s)
  );
}

/** Advice / plan / “write/draft/generate” -> AI (unless clearly data) */
export function shouldAskAI(q: string) {
  const s = q.toLowerCase().trim();
  if (!s) return false;
  if (isGreeting(s)) return true;

  const advice =
    /(how|what|which|why|suggest|recommend|plan|strategy|intervention|tips|action|improve|increase|boost|reduce|fix|help)/.test(
      s
    ) ||
    /(write|draft|create|compose|generate)\b/.test(s) ||
    /\?$/.test(s);

  return advice && !looksLikeDataQuery(s);
}

/** Smart router: AI when needed, else data answerer */
export async function smartAsk(
  question: string,
  summary: CopilotContext,
  opts?: {
    forceAI?: boolean;
    dataAnswerer?: (q: string, summary: CopilotContext) => string;
  }
): Promise<{ type: 'ai' | 'data'; text: string }> {
  const q = question.trim();
  const useAI = !!opts?.forceAI || shouldAskAI(q);

  if (useAI) {
    const text = await askCopilot(q, summary);
    return { type: 'ai', text: text || 'No suggestions right now.' };
  }

  if (opts?.dataAnswerer) {
    const text = opts.dataAnswerer(q, summary) ?? '';
    return { type: 'data', text };
  }

  return { type: 'data', text: '' };
}
