// src/components/copilot/logic.ts
export type CopilotContext = Record<string, any>;

export async function askCopilot(question: string, context?: CopilotContext) {
  const res = await fetch(`/api/copilot-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // server expects { summary, question }
    body: JSON.stringify({ question, summary: context ?? {} }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Request failed');

  // server returns { suggestions: string }
  return data.suggestions as string;
}
