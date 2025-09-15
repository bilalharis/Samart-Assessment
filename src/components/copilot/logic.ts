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

  // avoid JSON errors on bad responses
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

/** Detect questions that are data lookups (answer from app data) */
function looksLikeDataQuery(q: string) {
  const s = q.toLowerCase();
  return (
    /overall|average|attendance|best subject|weak|top|bottom|rank|grade|class\s*\d|section|teacher|subject|score|result|summary/.test(s) ||
    /how\s+is|show|list|what\s+is\s+(the\s+)?(average|score|summary)/.test(s)
  );
}

/** Decide if we should ask AI (advice/plan/tips style questions) */
export function shouldAskAI(q: string) {
  const s = q.toLowerCase().trim();
  if (!s) return false;
  const advice = /(how|what|which|why|suggest|recommend|plan|strategy|intervention|tips|action|improve|increase|boost|reduce|fix|help)/.test(s);
  return advice && !looksLikeDataQuery(s);
}

/**
 * Smart router:
 * - If the question needs advice, call AI.
 * - Else, use your data answerer (if provided), or return type 'data' with empty text.
 */
export async function smartAsk(
  question: string,
  summary: CopilotContext,
  opts?: {
    forceAI?: boolean;
    dataAnswerer?: (q: string, summary: CopilotContext) => string;
  }
): Promise<{ type: 'ai' | 'data'; text: string }> {
  const forceAI = !!(opts && opts.forceAI);
  const useAI = forceAI || shouldAskAI(question);

  if (useAI) {
    const text = await askCopilot(question, summary);
    return { type: 'ai', text: text || 'No suggestions right now.' };
  }

  if (opts?.dataAnswerer) {
    const text = opts.dataAnswerer(question, summary) ?? '';
    return { type: 'data', text };
  }

  return { type: 'data', text: '' };
}
