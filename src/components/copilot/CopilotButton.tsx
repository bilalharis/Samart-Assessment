import React, { useMemo, useState, useContext, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Sparkles, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { DataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';
import { Role, Assessment, AssessmentResult, User } from '../../types';
import { mockUsers } from '../../data/mockData';

// ⬇️ Add this tiny helper near the top (below imports)
const getGradeForUser = (u: User) => {
  const g = (u as any)?.grade;
  if (g != null && g !== '') return String(g);
  // fallback: parse any digits from classId like "class-5" → "5"
  const m = String(u.classId || '').match(/\d+/);
  return m ? m[0] : '';
};

const lines = (...ls: (string | undefined | false)[]) =>
  ls.filter(Boolean).join('\n');

type Msg = { from: 'user' | 'assistant'; text: string };

const toKey = (s: string) => s.toLowerCase().trim();
const pct = (n: number) => `${Math.max(0, Math.min(100, Math.round(n)))}%`;
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

function fuzzyFindUserByName(q: string, role: Role) {
  const key = toKey(q);
  const candidates = mockUsers.filter((u) => u.role === role);
  let best: User | undefined;
  let score = -1;
  for (const u of candidates) {
    const uq = toKey(u.name).split(/\s+/);
    const qq = key.split(/\s+/);
    const s = qq.reduce((acc, t) => acc + (uq.includes(t) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      best = u;
    }
  }
  return score > 0 ? best : undefined;
}

/* -------------------- Answer builders -------------------- */

function buildTeacherSummary(teacher: User, assessments: Assessment[], results: AssessmentResult[]) {
  const myAssessIds = new Set(
    assessments.filter((a) => a.teacherId === teacher.userId).map((a) => a.assessmentId)
  );
  const myResults = results.filter((r) => myAssessIds.has(r.assessmentId));
  const overallAvg = avg(myResults.map((r) => r.score ?? 0));

  const classStudents = mockUsers.filter(
    (u) => u.role === Role.STUDENT && u.classId === teacher.classId
  );

  const byStudent = classStudents
    .map((stu) => {
      const rs = myResults.filter((r) => r.studentId === stu.userId);
      return { student: stu, mean: avg(rs.map((r) => r.score ?? 0)), count: rs.length };
    })
    .filter((x) => x.count > 0);

  const top = [...byStudent].sort((a, b) => b.mean - a.mean).slice(0, 3);
  const bottom = [...byStudent].sort((a, b) => a.mean - b.mean).slice(0, 3);

  const mastered = myResults.filter((r) => (r.score ?? 0) >= 80).length;
  const developing = myResults.filter((r) => (r.score ?? 0) >= 60 && (r.score ?? 0) < 80).length;
  const needs = myResults.filter((r) => (r.score ?? 0) < 60).length;

  const grade = (teacher as any)?.grade ?? getGradeForUser(teacher);

  return lines(
    `Teacher: ${teacher.name}`,
    grade ? `Grade: ${grade}` : undefined,
    `Assessments: ${myAssessIds.size}`,
    `Results recorded: ${myResults.length}`,
    `Average: ${pct(overallAvg)}`,
    `Distribution: Mastered ${mastered} · Developing ${developing} · Needs Support ${needs}`,
    top.length ? `Top students: ${top.map((t) => `${t.student.name} (${pct(t.mean)})`).join(', ')}` : 'Top students: —',
    bottom.length ? `Needs support: ${bottom.map((t) => `${t.student.name} (${pct(t.mean)})`).join(', ')}` : 'Needs support: —'
  );
}

function buildStudentSummary(student: User, assessments: Assessment[], results: AssessmentResult[]) {
  const rs = results.filter((r) => r.studentId === student.userId);
  if (!rs.length) return `No results found for ${student.name} yet.`;

  const overallAvg = avg(rs.map((r) => r.score ?? 0));
  const bySubject = new Map<string, number[]>();
  rs.forEach((r) => {
    const a = assessments.find((x) => x.assessmentId === r.assessmentId);
    const subj = (a?.subject || 'Subject').trim();
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj)!.push(r.score ?? 0);
  });

  const recent = [...rs]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 5)
    .map((r) => {
      const a = assessments.find((x) => x.assessmentId === r.assessmentId);
      return `- ${a?.title || 'Assessment'} — ${pct(r.score ?? 0)}`;
    });

  const grade = getGradeForUser(student);

  return lines(
    `Student: ${student.name}`,
    grade ? `Grade: ${grade}` : undefined,
    `Average: ${pct(overallAvg)}`,
    `By subject:`,
    ...Array.from(bySubject.entries()).map(([s, arr]) => `- ${s}: ${pct(avg(arr))}`),
    recent.length ? `Recent results:\n${recent.join('\n')}` : undefined
  );
}

function buildSubjectOverview(subjectKey: string, assessments: Assessment[], results: AssessmentResult[]) {
  const ids = new Set(
    assessments.filter((a) => toKey(a.subject || '').includes(subjectKey)).map((a) => a.assessmentId)
  );
  const rs = results.filter((r) => ids.has(r.assessmentId));
  if (!rs.length) return `No results found for ${subjectKey} yet.`;

  const a = avg(rs.map((r) => r.score ?? 0));
  const mastered = rs.filter((r) => (r.score ?? 0) >= 80).length;
  const developing = rs.filter((r) => (r.score ?? 0) >= 60 && (r.score ?? 0) < 80).length;
  const needs = rs.filter((r) => (r.score ?? 0) < 60).length;

  return lines(
    `Subject: ${subjectKey[0].toUpperCase() + subjectKey.slice(1)}`,
    `Results recorded: ${rs.length}`,
    `Average: ${pct(a)}`,
    `Distribution: Mastered ${mastered} · Developing ${developing} · Needs Support ${needs}`
  );
}

function buildClassOverview(classKey: string, assessments: Assessment[], results: AssessmentResult[]) {
  // classKey like "class-5"
  const students = mockUsers.filter((u) => u.role === Role.STUDENT && toKey(u.classId || '') === classKey);
  if (!students.length) return `No class found for ${classKey}.`;
  const ids = new Set(students.map((s) => s.userId));
  const rs = results.filter((r) => ids.has(r.studentId));
  if (!rs.length) return `No results recorded for ${classKey}.`;

  const a = avg(rs.map((r) => r.score ?? 0));

  const byStudent = students
    .map((stu) => {
      const mine = rs.filter((r) => r.studentId === stu.userId);
      return { stu, mean: avg(mine.map((m) => m.score ?? 0)), count: mine.length };
    })
    .filter((x) => x.count > 0);

  const top = [...byStudent].sort((x, y) => y.mean - x.mean).slice(0, 3);
  const bottom = [...byStudent].sort((x, y) => x.mean - y.mean).slice(0, 3);

  // Label with Grade (prefer user.grade; otherwise parse from classKey)
  const gradeNum = (students[0] && getGradeForUser(students[0])) || (classKey.match(/\d+/)?.[0] ?? '');

  return lines(
    gradeNum ? `Grade: ${gradeNum}` : `Class: ${classKey}`,
    `Students with results: ${byStudent.length}`,
    `Average: ${pct(a)}`,
    top.length ? `Top students: ${top.map((t) => `${t.stu.name} (${pct(t.mean)})`).join(', ')}` : 'Top students: —',
    bottom.length ? `Needs support: ${bottom.map((b) => `${b.stu.name} (${pct(b.mean)})`).join(', ')}` : 'Needs support: —'
  );
}
function buildSchoolOverview(assessments: Assessment[], results: AssessmentResult[]) {
  const a = avg(results.map((r) => r.score ?? 0));
  const mastered = results.filter((r) => (r.score ?? 0) >= 80).length;
  const developing = results.filter((r) => (r.score ?? 0) >= 60 && (r.score ?? 0) < 80).length;
  const needs = results.filter((r) => (r.score ?? 0) < 60).length;

  const classIds = Array.from(
    new Set(mockUsers.filter((u) => u.role === Role.STUDENT).map((u) => u.classId || ''))
  ).filter(Boolean);

  const classLines = classIds.map((cid) => {
    const sIds = new Set(mockUsers.filter((u) => u.role === Role.STUDENT && u.classId === cid).map((u) => u.userId));
    const rs = results.filter((r) => sIds.has(r.studentId));
    const m = avg(rs.map((r) => r.score ?? 0));
    // Try to present Grade N (parse from cid)
    const gradeNum = cid.match(/\d+/)?.[0];
    const label = gradeNum ? `Grade ${gradeNum}` : cid;
    return `- ${label}: ${pct(m)} (${rs.length} results)`;
  });

  const latest = [...assessments]
    .sort((x, y) => y.assessmentId.localeCompare(x.assessmentId))
    .slice(0, 3)
    .map((a) => `- ${a.title} (${a.subject || 'Subject'})`);

  return lines(
    `School overview`,
    `Results recorded: ${results.length}`,
    `Average: ${pct(a)}`,
    `Distribution: Mastered ${mastered} · Developing ${developing} · Needs Support ${needs}`,
    classLines.length ? `By grade:\n${classLines.join('\n')}` : undefined,
    latest.length ? `Latest assessments:\n${latest.join('\n')}` : undefined
  );
}

/* -------------------- Router -------------------- */

function answerFor(q: string, role: Role, assessments: Assessment[], results: AssessmentResult[]) {
  const text = toKey(q);

  // School overview / overall performance
  if (
    /school overall|overall school|overall performance|school overview|performance of school/.test(text)
  ) {
    return buildSchoolOverview(assessments, results);
  }

  // Subject queries
  const subjHit = ['math', 'science', 'english', 'arabic'].find((s) => text.includes(s));
  if (subjHit) {
    return buildSubjectOverview(subjHit, assessments, results);
  }

  // Class queries (e.g., "class 1" -> "class-1")
  const classMatch = text.match(/(class|grade)\s*(-?\s*\d+)/);
  if (classMatch) {
    const n = classMatch[1].replace(/\s/g, '');
    const key = `class-${n}`;
    return buildClassOverview(toKey(key), assessments, results);
  }

  // Teacher
  if (/\bteacher\b/.test(text) || /\bclass summary\b/.test(text)) {
    const t = fuzzyFindUserByName(text, Role.TEACHER);
    if (t) return buildTeacherSummary(t, assessments, results);
  }

  // Student
  if (/(student|learner)\b/.test(text) || /(performance|result|score)\b.*\bof\b/.test(text)) {
    const s = fuzzyFindUserByName(text, Role.STUDENT);
    if (s) return buildStudentSummary(s, assessments, results);
  }

  // Fallback
  return buildSchoolOverview(assessments, results);
}

/* -------------------- UI -------------------- */

const QuickChip: React.FC<{ label: string; onPick: (q: string) => void }> = ({ label, onPick }) => (
  <button
    onClick={() => onPick(label)}
    className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
    title={label}
  >
    {label}
  </button>
);

const CopilotButton: React.FC = () => {
  const auth = useContext(AuthContext);
  const data = useContext(DataContext);

  // Only show for Principal (remove this check to show for all roles)
  if (!auth?.user || auth.user.role !== Role.PRINCIPAL) return null;

  const assessments = data?.assessments ?? [];
  const results = data?.assessmentResults ?? [];

  const [open, setOpen] = useState(false);

  // ⬇️ single source of truth welcome message
  const initialAssistant: Msg = {
    from: 'assistant',
    text: 'Welcome — ask anything about students, teachers, classes, or subjects.',
  };

  const [msgs, setMsgs] = useState<Msg[]>([initialAssistant]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, open]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((p) => [...p, { from: 'user', text: q }]);
    const ans = answerFor(q, auth.user!.role, assessments, results);
    setMsgs((p) => [...p, { from: 'assistant', text: ans }]);
  };

  // ⬇️ Clear / Reset chat
  const resetChat = useCallback(() => {
    setMsgs([initialAssistant]);
    setInput('');
    // If you persist threads, clear here:
    // try { localStorage.removeItem('copilot-thread'); } catch {}
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  // ⌨️ Cmd/Ctrl + K to clear when modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        resetChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, resetChat]);

  return (
    <>
      {/* Button with label + subtle AI glow on hover */}
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
          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            <QuickChip label="School overall performance" onPick={ask} />
            <QuickChip label="How is Zayed Al Maktoum performing?" onPick={ask} />
            <QuickChip label="Teacher Ms. Fatima summary" onPick={ask} />
            <QuickChip label="Math subject overview" onPick={ask} />
            <QuickChip label="Class 1 summary" onPick={ask} />
          </div>

          {/* Clear chat button row */}
          <div className="flex items-center justify-end -mb-1">
            <button
              onClick={() => {
                if (msgs.length <= 1 || window.confirm('Clear this conversation?')) resetChat();
              }}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md
                         border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
              title="Start a new chat (⌘/Ctrl + K)"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          {/* Conversation */}
          <div
            ref={scrollRef}
            className="border rounded-md p-3 bg-gray-50 max-h-[55vh] overflow-y-auto"
          >
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
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
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
                ask(input);
                setInput('');
              }}
              className="inline-flex items-center gap-1 bg-royal-blue text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-opacity-90"
            >
              <Send className="h-4 w-4" />
              Ask
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CopilotButton;

