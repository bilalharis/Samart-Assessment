// src/components/copilot/CopilotButton.tsx
// src/components/copilot/CopilotButton.tsx
import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { DataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';
import { Role, Assessment, AssessmentResult, User } from '../../types';
import { mockUsers } from '../../data/mockData';
import { smartAsk, shouldAskAI } from './logic';

/* ----------------------- helpers (same as before) ----------------------- */
const getGradeForUser = (u: User) => {
  const g = (u as any)?.grade;
  if (g != null && g !== '') return String(g);
  const m = String(u.classId || '').match(/\d+/);
  return m ? m[0] : '';
};
const lines = (...ls: (string | undefined | false)[]) => ls.filter(Boolean).join('\n');
type Msg = { from: 'user' | 'assistant'; text: string };
const toKey = (s: string) => s.toLowerCase().trim();
const pct = (n: number) => `${Math.max(0, Math.min(100, Math.round(n)))}%`;
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

/* ------------------- small context string for the LLM -------------------- */
function makeSchoolContext(assessments: Assessment[], results: AssessmentResult[]) {
  const overall = pct(avg(results.map(r => r.score ?? 0)));
  const latest = [...assessments]
    .sort((a, b) => b.assessmentId.localeCompare(a.assessmentId))
    .slice(0, 3)
    .map(a => `${a.title} (${a.subject || 'Subject'})`)
    .join('; ');
  const classes = Array.from(
    new Set(mockUsers.filter(u => u.role === Role.STUDENT).map(u => u.classId || ''))
  ).filter(Boolean);
  return [
    `School average: ${overall}`,
    `Results recorded: ${results.length}`,
    classes.length ? `Grades: ${classes.join(', ')}` : '',
    latest ? `Latest assessments: ${latest}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

/* ---------------------- local data answer function ---------------------- */
function answerFor(
  q: string,
  _role: Role,
  assessments: Assessment[],
  results: AssessmentResult[]
): string {
  const ql = q.toLowerCase();

  // Map assessmentId -> assessment (to read subject/title)
  const aById = new Map(assessments.map(a => [a.assessmentId, a]));

  // Build subject averages
  const subjectSum = new Map<string, { sum: number; count: number }>();
  for (const r of results) {
    const a = aById.get(r.assessmentId as any);
    const subject = (a?.subject || 'General').toString();
    const s = subjectSum.get(subject) || { sum: 0, count: 0 };
    s.sum += Number(r.score ?? 0);
    s.count += 1;
    subjectSum.set(subject, s);
  }

  const overall = avg(results.map(r => Number(r.score ?? 0)));

  const subjectAvg = [...subjectSum.entries()].map(([subj, { sum, count }]) => ({
    subj,
    avg: count ? sum / count : 0,
    count,
  }));

  // If a subject word is in the question, return that subject summary
  const found = subjectAvg.find(s => ql.includes(s.subj.toLowerCase()));
  if (found) {
    return lines(
      `Subject: ${found.subj}`,
      `Average: ${pct(found.avg)}`,
      `Assessments graded: ${found.count}`,
      `Tip: focus weak students with short practice sets and track re-tests next week.`
    );
  }

  // Default: overall + best/weak subjects
  const sorted = [...subjectAvg].sort((a, b) => b.avg - a.avg);
  const best = sorted[0];
  const weak = sorted[sorted.length - 1];

  return lines(
    `Overall average: ${pct(overall)}`,
    best ? `Best subject: ${best.subj} (${pct(best.avg)})` : '',
    weak && weak !== best ? `Needs attention: ${weak.subj} (${pct(weak.avg)})` : '',
    `Use "Get AI suggestions" for an action plan.`
  );
}

/* ---------------------------- QuickChip ---------------------------------- */
const QuickChip: React.FC<{ label: string; onPick: (q: string) => void }> = ({ label, onPick }) => (
  <button
    onClick={() => onPick(label)}
    className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
    title={label}
  >
    {label}
  </button>
);

/* ---------------------------- CopilotButton ------------------------------ */
const CopilotButton: React.FC = () => {
  const auth = useContext(AuthContext);
  const data = useContext(DataContext);

  if (!auth?.user || auth.user.role !== Role.PRINCIPAL) return null;

  const assessments = data?.assessments ?? [];
  const results = data?.assessmentResults ?? [];

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'assistant', text: 'Welcome — ask anything about students, teachers, classes, or subjects.' },
  ]);
  const [input, setInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, open]);

  // Small helper to build the summary we pass to AI
  const buildSummary = () => ({
    overview: makeSchoolContext(assessments, results),
    counts: { assessments: assessments.length, results: results.length },
  });

  // SMART Ask: routes to AI for advice-type questions; otherwise uses local data
  const handleAskSmart = async (q: string) => {
    const question = q.trim();
    if (!question) return;

    // show user message
    setMsgs(p => [...p, { from: 'user', text: question }]);

    const summary = buildSummary();
    const willUseAI = shouldAskAI(question);

    try {
      if (willUseAI) setAiBusy(true);

      const res = await smartAsk(question, summary, {
        dataAnswerer: (qq) => answerFor(qq, auth.user!.role, assessments, results),
      });

      const botText = res.type === 'ai' ? `Suggestions:\n${res.text}` : res.text;
      setMsgs(p => [...p, { from: 'assistant', text: botText }]);
    } catch (e: any) {
      setMsgs(p => [
        ...p,
        { from: 'assistant', text: `Sorry, I could not answer that. ${String(e?.message || e)}` },
      ]);
    } finally {
      setAiBusy(false);
      setInput('');
    }
  };

  // Always-AI button
  const askSuggestions = async () => {
    const summary = buildSummary();
    try {
      setAiBusy(true);
      const res = await smartAsk('Give an action plan based on this summary.', summary, { forceAI: true });
      setMsgs(p => [...p, { from: 'assistant', text: `Suggestions:\n${res.text}` }]);
    } catch (e: any) {
      setMsgs(p => [
        ...p,
        { from: 'assistant', text: `Could not fetch AI suggestions. ${String(e?.message || e)}` },
      ]);
    } finally {
      setAiBusy(false);
    }
  };

  const clearChat = () => {
    setMsgs([{ from: 'assistant', text: 'Welcome — ask anything about students, teachers, classes, or subjects.' }]);
  };

  return (
    <>
      {/* Header button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-gray-300 bg-white text-royal-blue
                   hover:bg-gradient-to-r hover:from-white hover:via-blue-50 hover:to-white hover:shadow-[0_0_0_3px_rgba(20,63,140,0.08)]
                   transition"
        aria-label="Open Copilot"
        title="Copilot"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-semibold">Copilot</span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Smart Assessment Copilot">
        <div className="flex flex-col gap-3">
          {/* Suggestions row */}
          <div className="flex flex-wrap items-center gap-2">
            <QuickChip label="School overall performance" onPick={handleAskSmart} />
            <QuickChip label="How is Zayed Al Maktoum performing?" onPick={handleAskSmart} />
            <QuickChip label="Teacher Ms. Fatima summary" onPick={handleAskSmart} />
            <QuickChip label="Math subject overview" onPick={handleAskSmart} />
            <QuickChip label="Class 1 summary" onPick={handleAskSmart} />
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
                title="Clear conversation"
              >
                Clear chat
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div className="border rounded-md p-3 bg-gray-50 max-h-[55vh] overflow-y-auto">
            {msgs.map((m, i) => (
              <div key={i} className={`mb-3 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    m.from === 'user' ? 'bg-royal-blue text-white' : 'bg-white border'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {aiBusy && (
              <div className="text-left">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-white border">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting AI suggestions…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input + buttons */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskSmart(input);
                  }
                }}
                placeholder="Ask about a student, a teacher, a class, a subject, or ask for suggestions…"
                className="w-full border rounded-md py-2 pl-3 pr-10 text-sm focus:ring-royal-blue focus:border-royal-blue"
              />
              <Bot className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-royal-blue" />
            </div>

            <button
              onClick={() => handleAskSmart(input)}
              className="inline-flex items-center gap-1 bg-royal-blue text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-opacity-90"
              title="Ask (smart)"
            >
              <Send className="h-4 w-4" />
              Ask
            </button>

            <button
              disabled={aiBusy}
              onClick={askSuggestions}
              className="inline-flex items-center gap-1 border px-3 py-2 rounded-md text-sm hover:bg-gray-50 disabled:opacity-60"
              title="Get AI suggestions to improve performance"
            >
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Get AI suggestions
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CopilotButton;



