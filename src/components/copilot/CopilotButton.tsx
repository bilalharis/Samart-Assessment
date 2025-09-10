import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { DataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';
import { Role, Assessment, AssessmentResult, User } from '../../types';
import { mockUsers } from '../../data/mockData';

/* ----------------------- helpers from your version ----------------------- */
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
  ].filter(Boolean).join(' | ');
}

/* ----------------- your existing answerFor & friends (omitted) ----------- */
/*  keep your existing buildStudentSummary/buildTeacherSummary/etc. and
    your answerFor() routing here – unchanged                         */

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

  const askLocal = (q: string) => {
    if (!q.trim()) return;
    setMsgs(p => [...p, { from: 'user', text: q }]);
    const ans = answerFor(q, auth.user!.role, assessments, results);
    setMsgs(p => [...p, { from: 'assistant', text: ans }]);
  };

  const askSuggestions = async () => {
    // Use last user question as "question".
    const lastUser = [...msgs].reverse().find(m => m.from === 'user')?.text || input || 'School overall performance';
    const context = makeSchoolContext(assessments, results);

    try {
      setAiBusy(true);
      const res = await fetch('/api/copilot-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: lastUser, context }),
      });
      const data = await res.json();
      const tip = data?.suggestions || data?.answer || 'No suggestions were returned.';
      setMsgs(p => [...p, { from: 'assistant', text: `Suggestions:\n${tip}` }]);
    } catch (e: any) {
      setMsgs(p => [...p, { from: 'assistant', text: `Could not fetch AI suggestions. ${String(e?.message || e)}` }]);
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
            <QuickChip label="School overall performance" onPick={askLocal} />
            <QuickChip label="How is Zayed Al Maktoum performing?" onPick={askLocal} />
            <QuickChip label="Teacher Ms. Fatima summary" onPick={askLocal} />
            <QuickChip label="Math subject overview" onPick={askLocal} />
            <QuickChip label="Class 1 summary" onPick={askLocal} />
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
                    askLocal(input);
                    setInput('');
                  }
                }}
                placeholder="Ask about a student, a teacher, a class, a subject, or the overall school…"
                className="w-full border rounded-md py-2 pl-3 pr-10 text-sm focus:ring-royal-blue focus:border-royal-blue"
              />
              <Bot className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-royal-blue" />
            </div>

            <button
              onClick={() => {
                askLocal(input);
                setInput('');
              }}
              className="inline-flex items-center gap-1 bg-royal-blue text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-opacity-90"
              title="Ask locally"
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


