import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { mockUsers } from '../../data/mockData';
import {
  User,
  Role,
  Assessment,
  AssessmentResult,
  AssessmentSubmission,
  QuestionType,
} from '../../types';

import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import PerformanceMatrix from './PerformanceMatrix';
import LessonPlanner from './LessonPlanner';
import AssessmentBuilder from './AssessmentBuilder';

import { Bell, BarChart2, Target, PlusCircle, Edit, Mail } from 'lucide-react';

/* ------------------------------ Notifications ----------------------------- */
const NotificationsPanel = ({ teacherId }: { teacherId: string }) => {
  const dataContext = useContext(DataContext);
  const notifications =
    dataContext?.notifications.filter((n) => n.userId === teacherId && !n.isRead) || [];
  if (notifications.length === 0) return null;

  return (
    <Card className="mb-6 bg-blue-50 border-l-4 border-royal-blue">
      <h3 className="text-lg font-bold text-royal-blue mb-2 flex items-center">
        <Bell className="mr-2" />
        New Notifications
      </h3>
      <ul className="space-y-2">
        {notifications.slice(0, 3).map((n) => (
          <li key={n.id} className="text-sm text-gray-700">
            {n.message}
          </li>
        ))}
        {notifications.length > 3 && (
          <li className="text-sm font-semibold text-gray-500">
            ...and {notifications.length - 3} more
          </li>
        )}
      </ul>
    </Card>
  );
};

/* ----------------------- Robust MCQ detection ----------------------------- */
const isMCQ = (q: any): boolean => {
  if (!q) return false;
  if (Array.isArray(q.options) && typeof (q as any).correctOptionIndex === 'number') return true;

  const t = q.type;
  if (!t && t !== 0) return false;
  const toKey = (v: any) =>
    String(v)
      .replace(/[\s_-]+/g, '')
      .toLowerCase();
  const key = toKey(t);
  if (key === 'mcq' || key === 'multiplechoice' || key.includes('multiplechoice')) return true;

  try {
    const qt = QuestionType as any;
    if (qt?.MULTIPLE_CHOICE && t === qt.MULTIPLE_CHOICE) return true;
  } catch {
    /* ignore */
  }
  return false;
};

const safeToString = (v: any) => {
  if (v == null) return 'Not answered';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
};

/* --------------------------------- Grader --------------------------------- */
const GradingModal = ({
  submission,
  isOpen,
  onClose,
  onGrade,
}: {
  submission: AssessmentSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onGrade: (submissionId: string, score: number) => void;
}) => {
  const dataContext = useContext(DataContext);

  const [mcqMarks, setMcqMarks] = useState<Record<number, boolean>>({});
  const [shortScores, setShortScores] = useState<Record<number, number>>({});

  const assessment = useMemo(
    () =>
      submission
        ? dataContext?.assessments.find((a) => a.assessmentId === submission.assessmentId)
        : undefined,
    [submission, dataContext]
  );

  const questions = Array.isArray(assessment?.questions) ? assessment!.questions : [];

  useEffect(() => {
    if (!submission || questions.length === 0) {
      setMcqMarks({});
      setShortScores({});
      return;
    }
    const initialMcq: Record<number, boolean> = {};
    const initialShort: Record<number, number> = {};

    questions.forEach((q, idx) => {
      if (isMCQ(q)) {
        const ansIdxRaw = (submission.answers ?? [])[idx];
        const ansIdx = ansIdxRaw == null ? -1 : Number(ansIdxRaw);
        initialMcq[idx] = ansIdx === (q as any).correctOptionIndex;
      }
    });

    setMcqMarks(initialMcq);
    setShortScores(initialShort);
  }, [submission, questions]);

  if (!isOpen || !submission || !assessment || questions.length === 0) return null;

  const student = mockUsers.find((u) => u.userId === submission.studentId);

  const perQuestionPercents = questions.map((q, idx) =>
    isMCQ(q) ? (mcqMarks[idx] ? 100 : 0) : shortScores[idx]
  );

  const missingShort = questions.some(
    (q, idx) => !isMCQ(q) && (shortScores[idx] === undefined || Number.isNaN(shortScores[idx]))
  );

  const computedScore = (() => {
    const vals = perQuestionPercents.map((n) => (typeof n === 'number' && isFinite(n) ? n : 0));
    const avg = vals.reduce((s, n) => s + n, 0) / Math.max(1, vals.length);
    return Math.max(0, Math.min(100, Math.round(avg)));
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Grading: ${assessment.title || 'Assessment'} for ${student?.name || ''}`}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {questions.map((q, idx) => {
          const ansArray = submission.answers ?? [];
          const studentAnswer = isMCQ(q)
            ? (q as any).options?.[Number(ansArray[idx])] ?? 'Not answered'
            : ansArray[idx];

          return (
            <div key={idx} className="p-3 border rounded-lg bg-gray-50">
              <p className="font-semibold">
                {idx + 1}. {q?.questionText ?? 'Question'}
              </p>

              <div className="mt-2 p-2 bg-blue-50 rounded">
                <p className="text-sm font-bold text-royal-blue">Student&apos;s Answer:</p>
                <p className="text-sm text-gray-700">{safeToString(studentAnswer)}</p>
              </div>

              {isMCQ(q) ? (
                <>
                  <div className="mt-1 p-2 bg-green-50 rounded">
                    <p className="text-sm font-bold text-green-700">Correct Answer:</p>
                    <p className="text-sm text-gray-700">
                      {(q as any).options?.[(q as any).correctOptionIndex] ?? '—'}
                    </p>
                  </div>
                  <div className="mt-2 text-right">
                    <label className="flex items-center justify-end space-x-2 cursor-pointer">
                      <span className="font-semibold text-sm">Mark as Correct</span>
                      <input
                        type="checkbox"
                        checked={!!mcqMarks[idx]}
                        onChange={(e) => setMcqMarks((p) => ({ ...p, [idx]: e.target.checked }))}
                        className="h-5 w-5 rounded text-royal-blue focus:ring-royal-blue"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <label className="text-sm font-semibold text-gray-700">Score (0–100):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={shortScores[idx] ?? ''}
                    onChange={(e) => {
                      const v =
                        e.target.value === ''
                          ? undefined
                          : Math.max(0, Math.min(100, Number(e.target.value)));
                      setShortScores((p) => ({ ...p, [idx]: v as number }));
                    }}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:ring-royal-blue focus:border-royal-blue"
                    placeholder="—"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-lg text-royal-blue">Final Score: {computedScore}%</div>
        <div className="flex items-center gap-3">
          {missingShort && (
            <span className="text-xs text-amber-600">
              Enter scores for all short-answer questions to enable submission.
            </span>
          )}
          <button
            disabled={missingShort}
            onClick={() => onGrade(submission.submissionId, computedScore)}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              missingShort ? 'bg-gray-300 cursor-not-allowed' : 'bg-royal-blue hover:bg-opacity-90'
            }`}
          >
            Submit Grade
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ------------------------- Performance History modal ---------------------- */
/** Trend shows: Yellow = running average to date; Blue = current result */
const StudentHistoryModal = ({
  student,
  isOpen,
  onClose,
  allResults,
  assessments,
}: {
  student: User | null;
  isOpen: boolean;
  onClose: () => void;
  allResults: AssessmentResult[];
  assessments: Assessment[];
}) => {
  const [tab, setTab] = useState<'list' | 'trend'>('list');

  useEffect(() => {
    if (isOpen) setTab('list');
  }, [isOpen]);

  if (!student || !isOpen) return null;

  const last30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const historyAsc = allResults
    .filter((r) => r.studentId === student.userId && r.timestamp >= last30)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .map((r) => ({
      ...r,
      title: assessments.find((a) => a.assessmentId === r.assessmentId)?.title || 'Assessment',
      score: r.score ?? 0,
      dateLabel: r.timestamp
        ? new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '',
    }));

  const overallAvg =
    historyAsc.length === 0
      ? 0
      : Math.round(historyAsc.reduce((s, r) => s + (r.score ?? 0), 0) / historyAsc.length);

  const runningAverages: number[] = (() => {
    const out: number[] = [];
    let sum = 0;
    historyAsc.forEach((h, i) => {
      sum += h.score ?? 0;
      out.push(Math.round(sum / (i + 1)));
    });
    return out;
  })();

  const Chart = () => {
    if (historyAsc.length === 0) {
      return <div className="text-gray-500">No results in the last 30 days.</div>;
    }

    const width = 780;
    const height = 260;
    const padding = { top: 24, right: 24, bottom: 42, left: 36 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const count = historyAsc.length;
    const gap = 24;
    const barW = Math.max(28, Math.min(64, Math.floor((chartW - gap * (count - 1)) / count)));

    const y = (v: number) =>
      padding.top + chartH - (Math.max(0, Math.min(100, v)) / 100) * chartH;

    let x = padding.left;

    return (
      <svg width={width} height={height} role="img" aria-label="Trend bars">
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="11"
              fill="#6b7280"
            >
              {t}%
            </text>
          </g>
        ))}

        {historyAsc.map((h, i) => {
          const avg = runningAverages[i];
          const curr = h.score ?? 0;

          const baseY = y(0);
          const avgY = y(avg);
          const currY = y(curr);
          const avgH = baseY - avgY;
          const currH = baseY - currY;

          const barX = x;
          x += barW + gap;

          return (
            <g key={i}>
              {/* CURRENT result (blue) */}
              <rect x={barX} y={currY} width={barW} height={currH} fill="#143F8C" rx={6} />

              {/* RUNNING AVERAGE (yellow, translucent) */}
              <rect
                x={barX}
                y={avgY}
                width={barW}
                height={avgH}
                fill="#F59E0B"
                fillOpacity="0.55"
                stroke="#B45309"
                strokeWidth="1"
                rx={6}
              />

              <text
                x={barX + barW / 2}
                y={currY - 6}
                textAnchor="middle"
                fontSize="12"
                fontWeight={700}
                fill="#143F8C"
              >
                {curr}%
              </text>
              <text
                x={barX + barW / 2}
                y={avgY - 18}
                textAnchor="middle"
                fontSize="12"
                fontWeight={700}
                fill="#9A6A05"
              >
                Avg {avg}%
              </text>

              <text
                x={barX + barW / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize="12"
                fill="#374151"
              >
                {h.dateLabel}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Performance History: ${student.name}`}>
      <div className="text-sm text-gray-700 mb-3">
        Last 30 days — <span className="font-semibold">{historyAsc.length}</span> results, average{' '}
        <span className="font-semibold">{overallAvg}%</span>
      </div>

      <div className="mb-3 flex gap-4">
        <button
          className={`text-sm pb-1 border-b-2 ${
            tab === 'list' ? 'border-royal-blue text-royal-blue' : 'border-transparent text-gray-600'
          }`}
          onClick={() => setTab('list')}
        >
          List
        </button>
        <button
          className={`text-sm pb-1 border-b-2 ${
            tab === 'trend' ? 'border-royal-blue text-royal-blue' : 'border-transparent text-gray-600'
          }`}
          onClick={() => setTab('trend')}
        >
          Trend
        </button>
      </div>

      {tab === 'list' && (
        <div className="space-y-3">
          {historyAsc.length === 0 && (
            <div className="text-gray-500">No results in the last 30 days.</div>
          )}
          {historyAsc
            .slice()
            .reverse()
            .map((r, idx) => (
              <div key={idx} className="p-3 border rounded-md">
                <div className="flex justify-between text-sm font-semibold">
                  <span>{r.title}</span>
                  <span>{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ''}</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full bg-gray-200 rounded">
                    <div
                      className="h-2 bg-royal-blue rounded"
                      style={{ width: `${Math.max(0, Math.min(100, r.score || 0))}%` }}
                    />
                  </div>
                  <div className="text-right text-sm font-semibold mt-1">{r.score ?? 0}%</div>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'trend' && (
        <div className="overflow-x-auto">
          <div className="text-xs text-gray-600 mb-2">
            <span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ background: '#F59E0B' }} />
            <span className="mr-3">Average to date</span>
            <span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ background: '#143F8C' }} />
            <span>Current result</span>
          </div>
          <Chart />
        </div>
      )}
    </Modal>
  );
};

/* ------------------------- Small pie (no libs required) ------------------- */
function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, end);
  const e = polarToCartesian(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${cx} ${cy} Z`;
}
const ClassAveragesPie: React.FC<{
  mastered: number;
  developing: number;
  support: number;
}> = ({ mastered, developing, support }) => {
  const total = mastered + developing + support;
  if (total === 0) {
    return (
      <Card className="mt-6">
        <h3 className="text-lg font-bold text-royal-blue mb-2">Average Class Performance</h3>
        <p className="text-gray-500">No results yet for this subject.</p>
      </Card>
    );
  }

  const segs = [
    { label: 'Mastered', value: mastered, color: '#15803d' },
    { label: 'Developing', value: developing, color: '#f59e0b' },
    { label: 'Needs Support', value: support, color: '#dc2626' },
  ];

  let angle = 0;
  const cx = 110,
    cy = 110,
    r = 100;

  return (
    <Card className="mt-6">
      <h3 className="text-lg font-bold text-royal-blue mb-4">Average Class Performance</h3>
      <div className="flex items-center gap-8 flex-wrap">
        <svg width={220} height={220} viewBox="0 0 220 220">
          {segs.map((s, i) => {
            const sweep = (s.value / total) * 360;
            const path = arcPath(cx, cy, r, angle, angle + sweep);
            angle += sweep;
            return <path key={i} d={path} fill={s.color} stroke="#fff" strokeWidth={1} />;
          })}
        </svg>
        <div className="space-y-2">
          {segs.map((s) => (
            <div key={s.label} className="flex items-center text-sm text-gray-700">
              <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: s.color }} />
              {s.label} — <span className="ml-1 font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

/* --------------- Helpers for band tokens (table badges/pills) ------------- */
const bandForScore = (score?: number) => {
  const s = score ?? 0;
  if (s >= 85) return { label: 'Mastered', cls: 'bg-green-100 text-green-700' };
  if (s >= 60) return { label: 'Developing', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Needs Support', cls: 'bg-red-100 text-red-700' };
};

/* ------------------------------ Submissions (TABLE UI) -------------------- */
const TaskSubmissions = ({
  teacher,
  selectedAssessmentId,
  onStartGrade,
  onEditAssessment,
}: {
  teacher: User;
  selectedAssessmentId: string | null;
  onStartGrade: (submission: AssessmentSubmission) => void;
  onEditAssessment: (a: Assessment) => void;
}) => {
  const dataContext = useContext(DataContext);
  if (!dataContext) return null;

  const { assessments, assessmentSubmissions } = dataContext;

  const roster = useMemo(
    () => mockUsers.filter((u) => u.role === Role.STUDENT && u.classId === teacher.classId),
    [teacher.classId]
  );

  const currentAssessment = useMemo(
    () =>
      assessments.find(
        (a) =>
          a.assessmentId === selectedAssessmentId &&
          a.teacherId === teacher.userId &&
          a.classId === teacher.classId &&
          (a.subject || '').toLowerCase().includes((teacher.subject || '').toLowerCase())
      ),
    [assessments, selectedAssessmentId, teacher.userId, teacher.classId, teacher.subject]
  );

  if (!currentAssessment) {
    return (
      <Card>
        <h3 className="text-xl font-bold text-royal-blue mb-2">Student Task Submissions</h3>
        <p className="text-gray-500">Select an assessment to view submissions.</p>
      </Card>
    );
  }

  const rows = roster.map((stu) => {
    const sub = assessmentSubmissions.find(
      (s) => s.assessmentId === currentAssessment.assessmentId && s.studentId === stu.userId
    );
    const status: 'pending' | 'grade-now' | 'graded' =
      !sub ? 'pending' : sub.status === 'pending' ? 'grade-now' : 'graded';
    return { student: stu, submission: sub || null, status };
  });

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-royal-blue">Student Task Submissions</h3>
          <div className="text-sm text-gray-500 mt-1">
            Subject: {currentAssessment.subject} &nbsp;•&nbsp; {currentAssessment.title}
          </div>
        </div>
        <button
          onClick={() => onEditAssessment(currentAssessment)}
          className="text-sm bg-gold-accent text-royal-blue font-bold px-3 py-1 rounded hover:bg-opacity-90 flex items-center"
        >
          <Edit size={16} className="mr-1" />
          Edit
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr className="text-left text-sm text-gray-600 border-b">
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Score</th>
              <th className="py-2">Band</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, submission, status }) => {
              const score = submission?.score;
              const band = bandForScore(score);
              return (
                <tr key={student.userId} className="border-b last:border-0">
                  <td className="py-3 pr-4 text-sm">
                    <span className="font-semibold">{student.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {status === 'pending' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold border bg-gray-100 text-gray-700">
                        Pending
                      </span>
                    )}
                    {status === 'grade-now' && submission && (
                      <button
                        onClick={() => onStartGrade(submission)}
                        className="px-2 py-1 rounded-full text-xs font-semibold bg-royal-blue text-white hover:bg-opacity-90"
                      >
                        Grade now
                      </button>
                    )}
                    {status === 'graded' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold border bg-green-100 text-green-700">
                        Graded
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sm">{score != null ? `${score}%` : '—'}</td>
                  <td className="py-3">
                    {score != null ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${band.cls}`}>
                        {band.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

/* ------------------------------ Main dashboard ---------------------------- */
const TeacherDashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const dataContext = useContext(DataContext);
  const teacher = authContext?.user as User;

  const [activeTab, setActiveTab] = useState<'matrix' | 'builder' | 'planner' | 'grading' | 'submissions'>(
    'matrix'
  );
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  // Show only chapter name (e.g., "Chapter 3") or last segment if no chapter
  function getChapterLabel(title: string): string {
    const m = title.match(/Chapter\s*\d+/i);
    if (m) return m[0].replace(/\s+/g, ' ').trim();
    const parts = title.split(' - ');
    return (parts[parts.length - 1] || title).trim();
  }
  const [gradingSubmission, setGradingSubmission] = useState<AssessmentSubmission | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [historyStudent, setHistoryStudent] = useState<User | null>(null);

  // Toggle for Average Class Performance section
  const [showAvg, setShowAvg] = useState<boolean>(false);

  const teacherAssessments = useMemo(() => {
    if (!dataContext) return [];
    return dataContext.assessments.filter((a) => a.teacherId === teacher.userId) || [];
  }, [dataContext?.assessments, teacher.userId]);

  useEffect(() => {
    if (teacherAssessments.length > 0 && !selectedAssessmentId) {
      const chapter1 = teacherAssessments.find(a => /Chapter\s*1/i.test(a.title));
      setSelectedAssessmentId((chapter1 || teacherAssessments[0]).assessmentId);
    }
  }, [teacherAssessments, selectedAssessmentId]);

  if (!teacher || teacher.role !== Role.TEACHER || !dataContext) {
    return <div className="p-8">Access Denied</div>;
  }

  const classStudents = mockUsers.filter(
    (u) => u.role === Role.STUDENT && u.classId === teacher.classId
  );

  const allResultsForClass: AssessmentResult[] = useMemo(
    () =>
      dataContext.assessmentResults.filter((r) =>
        classStudents.some((s) => s.userId === r.studentId)
      ),
    [dataContext.assessmentResults, classStudents]
  );

  const currentAssessmentResults: AssessmentResult[] = useMemo(
    () => allResultsForClass.filter((r) => r.assessmentId === selectedAssessmentId),
    [allResultsForClass, selectedAssessmentId]
  );

  const currentPlan = useMemo(
    () => dataContext.lessonPlans.find((lp) => lp.assessmentId === selectedAssessmentId),
    [dataContext.lessonPlans, selectedAssessmentId]
  );

  const resultsVersion = useMemo(() => {
    const arr = dataContext.assessmentResults || [];
    return arr.map((r) => `${r.assessmentId}:${r.studentId}:${r.score}:${r.timestamp}`).join('|');
  }, [dataContext.assessmentResults]);

  const subjectAssessIds = useMemo(() => {
    const subj = (teacher.subject || '').toLowerCase();
    return new Set(
      dataContext.assessments
        .filter(
          (a) =>
            a.classId === teacher.classId &&
            (a.subject || '').toLowerCase().includes(subj)
        )
        .map((a) => a.assessmentId)
    );
  }, [dataContext.assessments, teacher.classId, teacher.subject]);

  const { masteredCount, developingCount, supportCount } = useMemo(() => {
    const scoresByStudent = new Map<string, number[]>();
    for (const r of allResultsForClass) {
      if (!subjectAssessIds.has(r.assessmentId)) continue;
      const arr = scoresByStudent.get(r.studentId) || [];
      arr.push(r.score || 0);
      scoresByStudent.set(r.studentId, arr);
    }

    let mastered = 0,
      developing = 0,
      support = 0;

    classStudents.forEach((stu) => {
      const arr = scoresByStudent.get(stu.userId) || [];
      if (arr.length === 0) return;
      const avg = arr.reduce((s, n) => s + n, 0) / arr.length;
      if (avg >= 85) mastered += 1;
      else if (avg >= 60) developing += 1;
      else support += 1;
    });

    return { masteredCount: mastered, developingCount: developing, supportCount: support };
  }, [allResultsForClass, subjectAssessIds, classStudents]);

  const handleGrade = (submissionId: string, score: number) => {
    dataContext.gradeAssessment(submissionId, score);
    setGradingSubmission(null);
  };

  const handleAssessmentSaved = (saved: Assessment) => {
    const normalized: Assessment = {
      ...saved,
      teacherId: teacher.userId,
      classId: teacher.classId || saved.classId,
      subject: teacher.subject || saved.subject,
    };
    dataContext.addAssessment(normalized);
    setSelectedAssessmentId(normalized.assessmentId);
    setEditingAssessment(null);
    setActiveTab('submissions');
  };

  const startEditAssessment = (ass: Assessment) => {
    setEditingAssessment(ass);
    setActiveTab('builder');
  };

  const Tab = ({
    id,
    label,
    icon,
  }: {
    id: typeof activeTab;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
        activeTab === id ? 'bg-royal-blue text-white shadow-inner' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // Only show Class Avg / Grade / Subject / Select Assessment on these tabs:
  const showHeaderFilters = ['matrix', 'planner', 'submissions'].includes(activeTab);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-royal-blue">Teacher Dashboard</h2>
            <p className="text-gray-600">Welcome, {teacher.name}</p>
          </div>

          {teacherAssessments.length > 0 && showHeaderFilters && (
            <div className="mt-4 sm:mt-0 flex items-end gap-3">
              <div className="px-3 py-1 rounded border text-sm text-gray-700 self-end">
                <span className="font-semibold">Grade:</span> 5
              </div>
              <div className="px-3 py-1 rounded border text-sm text-gray-700 self-end">
                <span className="font-semibold">Subject:</span> {teacher.subject || 'Science'}
              </div>

              <div className="self-end">
                <label
                  htmlFor="assessment-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Assessment
                </label>
                <select
                  id="assessment-select"
                  value={selectedAssessmentId || ''}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base rounded-md focus:outline-none focus:ring-royal-blue focus:border-royal-blue border border-gray-300 sm:text-sm"
                >
                  {teacherAssessments.map((ass) => (
                    <option key={ass.assessmentId} value={ass.assessmentId}>
                      {getChapterLabel(ass.title)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      <NotificationsPanel teacherId={teacher.userId} />

      
      {showHeaderFilters && (
        <div className="mb-3 flex items-center">
          <button
            onClick={() => setShowAvg((s) => !s)}
            className={`flex items-center px-3 py-2 text-sm rounded-lg border transition ${
              showAvg ? 'bg-royal-blue text-white border-royal-blue' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                showAvg ? 'bg-white' : 'bg-royal-blue'
              }`}
            />
            Class Avg
          </button>
        </div>
      )}

      <div className="flex border-b border-gray-300 flex-wrap">
        <Tab id="matrix" label="Performance Matrix" icon={<BarChart2 size={18} />} />
        <Tab id="builder" label="Create Assessment" icon={<PlusCircle size={18} />} />
        <Tab id="grading" label="Assessment Grading" icon={<Edit size={18} />} />
        <Tab id="planner" label="Activity Planner" icon={<Target size={18} />} />
        <Tab id="submissions" label="Task Submissions" icon={<Mail size={18} />} />
      </div>

      <div className="mt-6">
        {activeTab === 'matrix' && selectedAssessmentId && (
          <>
            <PerformanceMatrix
              key={`${selectedAssessmentId}-${resultsVersion}`}
              results={currentAssessmentResults}
              allResults={allResultsForClass}
              students={classStudents}
              onViewHistory={(s: any) => {
                const id = typeof s === 'string' ? s : (s?.userId as string);
                const stu = classStudents.find((u) => u.userId === id) || null;
                setHistoryStudent(stu);
              }}
            />

            {/* Average class performance — only when toggled ON */}
            {showAvg && (
              <ClassAveragesPie
                mastered={masteredCount}
                developing={developingCount}
                support={supportCount}
              />
            )}
          </>
        )}

        {activeTab === 'planner' && selectedAssessmentId && (
          <LessonPlanner
            students={classStudents}
            results={currentAssessmentResults}
            existingPlan={currentPlan}
            assessmentId={selectedAssessmentId}
          />
        )}

        {activeTab === 'builder' && (
          <div className="[&_input]:border [&_input]:border-gray-300 [&_textarea]:border [&_textarea]:border-gray-300 [&_select]:border [&_select]:border-gray-300">
            <AssessmentBuilder
              editingAssessment={editingAssessment || undefined}
              defaultSubject={teacher.subject || 'Science'}
              defaultGrade={(teacher as any).grade || '5'}
              forceClassId={teacher.classId || undefined}
              onSaved={handleAssessmentSaved}
            />
          </div>
        )}

        {activeTab === 'grading' && (
          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Pending Assessments for Grading</h3>
            <div className="space-y-3">
              {dataContext.assessmentSubmissions
                .filter((s) => {
                  if (s.status !== 'pending') return false;
                  const stuClass = mockUsers.find((u) => u.userId === s.studentId)?.classId;
                  if (stuClass !== teacher.classId) return false;
                  const subject =
                    dataContext.assessments.find((a) => a.assessmentId === s.assessmentId)?.subject || '';
                  return subject.toLowerCase().includes((teacher.subject || '').toLowerCase());
                })
                .map((s) => {
                  const ass = dataContext.assessments.find((a) => a.assessmentId === s.assessmentId);
                  const stu = mockUsers.find((u) => u.userId === s.studentId);
                  if (!ass || !stu) return null;
                  return (
                    <div key={s.submissionId} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-semibold">{stu.name}</span> submitted{' '}
                        <span className="font-semibold">{getChapterLabel(ass.title)}</span>
                      </div>
                      <button
                        onClick={() => setGradingSubmission(s)}
                        className="text-sm bg-royal-blue text-white px-3 py-1 rounded hover:bg-opacity-90"
                      >
                        Grade now
                      </button>
                    </div>
                  );
                })}
              {dataContext.assessmentSubmissions.filter((s) => {
                if (s.status !== 'pending') return false;
                const stuClass = mockUsers.find((u) => u.userId === s.studentId)?.classId;
                if (stuClass !== teacher.classId) return false;
                const subject =
                  dataContext.assessments.find((a) => a.assessmentId === s.assessmentId)?.subject || '';
                return subject.toLowerCase().includes((teacher.subject || '').toLowerCase());
              }).length === 0 && <p className="text-gray-500">No assessments pending grading.</p>}
            </div>
          </Card>
        )}

        {activeTab === 'submissions' && (
          <TaskSubmissions
            teacher={teacher}
            selectedAssessmentId={selectedAssessmentId}
            onStartGrade={(s) => setGradingSubmission(s)}
            onEditAssessment={startEditAssessment}
          />
        )}
      </div>

      {/* Grader modal */}
      <GradingModal
        submission={gradingSubmission}
        isOpen={!!gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        onGrade={handleGrade}
      />

      {/* Student history modal */}
      <StudentHistoryModal
        student={historyStudent}
        isOpen={!!historyStudent}
        onClose={() => setHistoryStudent(null)}
        allResults={allResultsForClass}
        assessments={dataContext.assessments}
      />
    </div>
  );
};

export default TeacherDashboard;


















