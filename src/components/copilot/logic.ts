// src/components/copilot/logic.ts
export type CopilotContext = Record<string, any>;

export async function askCopilot(question: string, context?: CopilotContext) {
  const res = await fetch('/api/copilot-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, summary: context ?? {} }),
  });

  // If API is missing or CORS blocked, this prevents "Unexpected end of JSON"
  const ct = res.headers.get('content-type') || '';
  const bodyText = await res.text();
  const data = ct.includes('application/json') ? JSON.parse(bodyText || '{}') : { error: bodyText };

  if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  return data.suggestions as string;
}

//its good
