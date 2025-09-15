// src/components/copilot/CopilotButton.tsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Bot, Sparkles, Loader2, Send } from 'lucide-react';
import Modal from '../ui/Modal';
import { DataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';
import { Role, Assessment, AssessmentResult } from '../../types';
import { mockUsers } from '../../data/mockData';
import { smartAsk, shouldAskAI, isGreeting } from './logic';

/* ---------------- small helpers ---------------- */
const lines = (...ls: (string | undefined | false)[]) => ls.filter(Boolean).join('\n');
type Msg = { from: 'user' | 'assistant'; text: string };
const pct = (n: number) => `${Math.max(0, Math.min(100, Math.round(n)))}%`;
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

/* ------------ make compact context string for AI ------------ */
function makeSchoolContext(assessments: Assessment[], results: AssessmentResult[]) {
  const overall = pct(avg(results.map(r => Number((r as any).score ?? 0))));
  const latest = [...assessments]
    .sort((a, b) => String(b.assessmentId).localeCompare(String(a.assessmentId)))
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

/* ----------------- read student id from result safely ----------------- */
function getResultStudentId(r: AssessmentResult | any): string {
  return String(
    r?.userId ??
      r?.studentId ??
      r?.studentID ??
      r?.student?.id ??
      r?.user?.id ??
      ''
  );
}

/* ---------------------- data answerer (local) ---------------------- */
function answerFromData(
  q: string,
  _role: Role,
  assessments: Assessment[],
  results: AssessmentResult[]
): string {
  const question = q.toLowerCase();

  // users
  const students = mockUsers.filter(u => u.role === Role.STUDENT);

  // quick student match by name
  const student = students.find(s => question.includes(String(s.name).toLowerCase()));

  // Map assessmentId -> assessment for subject lookup
  const aById = new Map<string, Assessment>(
    assessments.map(a => [String(a.assessmentId), a])
  );

  // student details
  if (student) {
    const studentId = String((student as any).userId ?? (student as any).id ?? '');
    const sResults = results.filter(r => getResultStudentId(r) === studentId);
    const overall = avg(sResults.map(r => Number((r as any).score ?? 0)));

    // subject stats
    const bySubj = new Map<string, { sum: number; count: number }>();
    for (const r of sResults) {
      const a = aById.get(String((r as any).assessmentId));
      const subj = (a?.subject || 'General').toString();
      const s = bySubj.get(subj) || { sum: 0, count: 0 };
      s.sum += Number((r as any).score ?? 0);
      s.count += 1;
      bySubj.set(subj, s);
    }

    const arr = [...bySubj.entries()].map(([name, v]) => ({
      name,
      avg: v.count ? v.sum / v.count : 0,
      count: v.count,
    }));
    const best = arr.slice().sort((a, b) => b.avg - a.avg)[0];
    const weak = arr.slice().sort((a, b) => a.avg - b.avg)[0];

    return lines(
      `Student: ${student.name}`,
      `Class: ${student.classId || '—'}`,
      `Overall: ${pct(overall)}`,
      best ? `Best: ${best.name} (${pct(best.avg)})` : '',
      weak && weak !== best ? `Needs help: ${weak.name} (${pct(weak.avg)})` : '',
      `Tip: short daily practice + 1 weekly recap usually lifts scores in 2–4 weeks.`
    );
  }

  // subject overview (by subject text)
  const subjects = Array.from(new Set(assessments.map(a => (a.subject || 'General').toString())));
  const hitSubj = subjects.find(s => question.includes(s.toLowerCase()));
  if (hitSubj) {
    let sum = 0,
      count = 0;
    for (const r of results) {
      const a = aById.get(String((r as any).assessmentId));
      if (String(a?.subject || '').toLowerCase() === hitSubj.toLowerCase()) {
        sum += Number((r as any).score ?? 0);
        count += 1;
      }
    }
    return lines(
      `Subject: ${hitSubj}`,
      `Average: ${pct(count ? sum / count : 0)}`,
      `Assessments graded: ${count}`,
      `Ask with "how/plan" for AI strategies.`
    );
  }

  // class/grade summary
  const classMatch = question.match(/class\s*(\d+)|grade\s*(\d+)/i);
  if (classMatch) {
    const classId = classMatch[1] || classMatch[2];
    const inClass = students.filter(s => String(s.classId).includes(String(classId)));
    const ids = new Set(inClass.map(s => String((s as any).userId ?? (s as any).id)));
    const rows = results.filter(r => ids.has(getResultStudentId(r)));
    const overall = avg(rows.map(r => Number((r as any).score ?? 0)));
    return lines(
      `Class ${classId} summary`,
      `Students: ${inClass.length}`,
      `Overall average: ${pct(overall)}`,
      `Ask for suggestions if you want a plan to raise this class.`
    );
  }

  // default: schoolwide overview with best/weak subject
  const subjectSum = new Map<string, { sum: number; count: number }>();
  for (const r of results) {
    const a = aById.get(String((r as any).assessmentId));
    const subj = (a?.subject || 'General').toString();
    const s = subjectSum.get(subj) || { sum: 0, count: 0 };
    s.sum += Number((r as any).score ?? 0);
    s.count += 1;
    subjectSum.set(subj, s);
  }
  const arr = [...subjectSum.entries()].map(([subj, v]) => ({
    subj,
    avg: v.count ? v.sum / v.count : 0,
  }));
  const sorted = arr.sort((a, b) => b.avg - a.avg);
  const best = sorted[0];
  const weak = sorted[sorted.length - 1];
  const overall = avg(results.map(r => Number((r as any).score ?? 0)));

  return lines(
    `Overall average: ${pct(overall)}`,
    best ? `Best subject: ${best.subj} (${pct(best.avg)})` : '',
    weak && weak !== best ? `Needs attention: ${weak.subj} (${pct(weak.avg)})` : '',
    `Ask for suggestions if you want a step-by-step plan.`
  );
}

/* --------------------------- QuickChip --------------------------- */
const QuickChip: React.FC<{ label: string; onPick: (q: string) => void }> = ({ label, onPick }) => (
  <button
    onClick={() => onPick(label)}
    className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
    title={label}
  >
    {label}
  </button>
);

/* ------------------------ CopilotButton ------------------------ */
const CopilotButton: React.FC = () => {
  const auth = useContext(AuthContext);
  const data = useContext(DataContext);
  if (!auth?.user || auth.user.role !== Role.PRINCIPAL) return null;

  const assessments = data?.assessments ?? [];
  const results = data?.assessmentResults ?? [];

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'assistant', text: 'Welcome — ask anything. Try: "How can I improve Grade 5 science?" or "Zayed details".' },
  ]);
  const [input, setInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, open]);

  const buildSummary = () => ({
    overview: makeSchoolContext(assessments, results),
    counts: { assessments: assessments.length, results: results.length },
  });

  // ONE BUTTON: decide AI vs data automatically
  const handleSend = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;

    setMsgs(p => [...p, { from: 'user', text: q }]);

    const summary = buildSummary();
    const willUseAI = isGreeting(q) || shouldAskAI(q);

    try {
      if (willUseAI) setAiBusy(true);

      const res = await smartAsk(q, summary, {
        dataAnswerer: (qq) => answerFromData(qq, auth.user!.role, assessments, results),
      });

      const botText = res.type === 'ai' ? res.text : res.text;
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

  const clearChat = () => {
    setMsgs([
      { from: 'assistant', text: 'Welcome — ask anything. Try: "How can I improve Grade 5 science?" or "Zayed details".' },
    ]);
  };

  return (
    <>
      {/* Launcher button */}
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
          {/* Quick chips (optional) */}
          <div className="flex flex-wrap items-center gap-2">
            <QuickChip label="School overall performance" onPick={handleSend} />
            <QuickChip label="How can I improve Grade 5 science?" onPick={handleSend} />
            <QuickChip label="Zayed Al Maktoum details" onPick={handleSend} />
            <QuickChip label="Write 5 science quiz questions" onPick={handleSend} />
            <div className="ml-auto">
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
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input + ONE “Ask” button (AI look) */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                placeholder="Ask for data or ideas… (e.g., “Zayed details”, “Write 5 algebra questions”, “How to boost science?”)"
                className="w-full border rounded-md py-2 pl-3 pr-12 text-sm focus:ring-royal-blue focus:border-royal-blue"
              />
              <Bot className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-royal-blue" />
            </div>

            <button
              onClick={() => handleSend(input)}
              disabled={aiBusy && !!input.trim()}
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md
                         bg-gradient-to-r from-royal-blue to-blue-600 text-white shadow
                         hover:opacity-90 disabled:opacity-60"
              title="Ask"
            >
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CopilotButton;





