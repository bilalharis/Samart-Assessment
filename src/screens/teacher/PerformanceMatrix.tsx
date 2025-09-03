import React, { useMemo, useState, useContext } from 'react';
import Card from '../../components/ui/Card';
import { AssessmentResult, PerformanceTier, User } from '../../types';
import { TIER_THRESHOLDS } from '../../constants';
import { DataContext } from '../../context/DataContext';
import { AuthContext } from '../../context/AuthContext';

/* --------------------- Tier helpers & styling --------------------- */
const tierOf = (score: number): PerformanceTier => {
  if (score >= TIER_THRESHOLDS[PerformanceTier.MASTERED]) return PerformanceTier.MASTERED;
  if (score >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]) return PerformanceTier.DEVELOPING;
  return PerformanceTier.NEEDS_SUPPORT;
};

const TIER_BG: Record<PerformanceTier, string> = {
  [PerformanceTier.MASTERED]: 'bg-green-700',
  [PerformanceTier.DEVELOPING]: 'bg-yellow-500',
  [PerformanceTier.NEEDS_SUPPORT]: 'bg-red-600',
};

const TIER_LABEL: Record<PerformanceTier, string> = {
  [PerformanceTier.MASTERED]: 'MASTERED',
  [PerformanceTier.DEVELOPING]: 'DEVELOPING',
  [PerformanceTier.NEEDS_SUPPORT]: 'NEEDS SUPPORT',
};

/* ---------------------- BAR CHART (Trend) ---------------------- */
const TrendBars = ({ items }: { items: Array<{ label: string; value: number }> }) => {
  if (!items.length) return <div className="text-gray-500">No results yet.</div>;

  const n = items.length;
  const width = Math.max(520, n * 68 + 60);
  const height = 240;

  const left = 44;
  const right = 12;
  const top = 12;
  const bottom = 48;

  const chartW = width - left - right;
  const chartH = height - top - bottom;

  const band = chartW / n;
  const barW = Math.max(20, band * 0.55);

  const y = (v: number) => top + (1 - v / 100) * chartH;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block">
        <g stroke="#e5e7eb" strokeWidth={1}>
          {ticks.map((t) => (
            <line key={t} x1={left} y1={y(t)} x2={width - right} y2={y(t)} />
          ))}
        </g>
        <g stroke="#9ca3af" strokeWidth={1}>
          <line x1={left} y1={top} x2={left} y2={height - bottom} />
          <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
        </g>

        {items.map((it, i) => {
          const cx = left + i * band + band / 2;
          const barX = cx - barW / 2;
          const barY = y(it.value);
          const barH = (it.value / 100) * chartH;
          return (
            <g key={i}>
              <rect x={barX} y={barY} width={barW} height={barH} rx={4} fill="#0033A0" opacity={0.95} />
              <text x={cx} y={Math.max(barY - 6, top + 10)} textAnchor="middle" fontSize="12" fill="#111827" fontWeight={600}>
                {Math.round(it.value)}%
              </text>
              <text x={cx} y={height - bottom + 28} textAnchor="middle" fontSize="12" fill="#4b5563">
                {it.label}
              </text>
            </g>
          );
        })}

        {ticks.map((t) => (
          <text key={t} x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#6b7280">
            {t}%
          </text>
        ))}
      </svg>
    </div>
  );
};

/* --------------------------- History overlay --------------------------- */
function HistoryOverlay({
  student,
  allResults,
  onClose,
}: {
  student: User;
  allResults: AssessmentResult[];
  onClose: () => void;
}) {
  const dataContext = useContext(DataContext);
  const assessments = dataContext && Array.isArray(dataContext.assessments) ? dataContext.assessments : [];

  // NEW: get current teacher's subject and filter results to that subject only
  const auth = useContext(AuthContext);
  const teacherSubject = (auth?.user as any)?.subject?.toString().toLowerCase() || '';

  const resultsForStudent = useMemo(() => {
    const list = Array.isArray(allResults) ? allResults : [];

    // Only this student AND only assessments matching teacher's subject
    const filtered = list.filter((r) => {
      if (r.studentId !== student.userId) return false;
      const ass = assessments.find((a) => a.assessmentId === r.assessmentId);
      if (!ass) return false;
      if (!teacherSubject) return true; // fallback: no subject set, show all
      return (ass.subject || '').toLowerCase().includes(teacherSubject);
    });

    return filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [allResults, student.userId, assessments, teacherSubject]);

  const last30Cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30 = resultsForStudent.filter((r) => (r.timestamp || 0) >= last30Cutoff);
  const avg = last30.length ? Math.round(last30.reduce((s, r) => s + (r.score ?? 0), 0) / last30.length) : 0;

  const titleOf = (assessmentId: string) => {
    const found = assessments.find((a) => a.assessmentId === assessmentId);
    return found ? found.title : 'Assessment';
  };

  const [tab, setTab] = useState<'list' | 'trend'>('list');
  const sortedForList = [...resultsForStudent].reverse();

  const trendItems = resultsForStudent.map((r) => ({
    label: r.timestamp ? new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
    value: Math.max(0, Math.min(100, r.score ?? 0)),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[min(860px,94vw)] max-h-[86vh] overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-bold text-royal-blue">Performance History: {student.name}</h3>
          <button onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-5 pt-3 text-sm text-gray-600">
          Last 30 days — <span className="font-semibold">{last30.length}</span> results, average{' '}
          <span className="font-semibold">{avg}%</span>
        </div>

        <div className="px-5 mt-2 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setTab('list')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
                tab === 'list'
                  ? 'border-royal-blue text-royal-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setTab('trend')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
                tab === 'trend'
                  ? 'border-royal-blue text-royal-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trend
            </button>
          </nav>
        </div>

        <div className="p-5">
          {tab === 'list' ? (
            <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
              {sortedForList.length === 0 && <div className="text-gray-500">No results yet.</div>}
              {sortedForList.map((r) => (
                <div key={r.resultId} className="rounded-lg border p-3 flex items-center justify-between">
                  <div className="mr-4">
                    <div className="font-semibold text-gray-800">{titleOf(r.assessmentId)}</div>
                    <div className="text-xs text-gray-500">
                      {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-2.5 rounded bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-royal-blue"
                        style={{ width: `${Math.max(0, Math.min(100, r.score ?? 0))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold w-12 text-right">{r.score ?? 0}%</div>
                </div>
              ))}
            </div>
          ) : (
            <TrendBars items={trendItems} />
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Matrix (main) --------------------------- */
type Props = {
  results: AssessmentResult[];        // results for the CURRENT (selected) assessment
  allResults: AssessmentResult[];     // results for all assessments (for history)
  students: User[];
  onViewHistory?: (student: User) => void;
};

const PerformanceMatrix: React.FC<Props> = ({ results, allResults, students }) => {
  const [selected, setSelected] = useState<User | null>(null);

  const scoreByStudent: Record<string, number | undefined> = useMemo(() => {
    const map: Record<string, number | undefined> = {};
    (Array.isArray(results) ? results : []).forEach((r) => {
      map[r.studentId] = r.score ?? 0;
    });
    return map;
  }, [results]);

  const tiles = (Array.isArray(students) ? students : []).map((s) => {
    const score = scoreByStudent[s.userId];
    const hasScore = typeof score === 'number';
    const tier = hasScore ? tierOf(score as number) : undefined;
    return { student: s, hasScore, score: score as number, tier };
  });

  return (
    <>
      <Card>
        <h3 className="text-xl font-bold text-royal-blue mb-4">Overall Performance</h3>
        {tiles.length === 0 ? (
          <p className="text-gray-500">No students found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tiles.map(({ student, hasScore, score, tier }) => {
              const colored = hasScore && tier !== undefined;
              const cardClasses = colored
                ? `${TIER_BG[tier!]} text-white`
                : 'bg-gray-200 text-gray-700';

              return (
                <button
                  key={student.userId}
                  onClick={() => setSelected(student)}
                  className={`text-left rounded-xl p-5 focus:outline-none transition hover:scale-[1.01] ${cardClasses}`}
                >
                  <div className={`flex items-center justify-center h-24 w-24 rounded-full mx-auto mb-4 ${colored ? 'bg-white/20' : 'bg-white/60'}`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-12 w-12 ${colored ? 'text-white/80' : 'text-gray-500'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle cx="12" cy="8" r="3" strokeWidth="2" />
                      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{student.name}</div>
                    {colored ? (
                      <>
                        <div className="text-3xl font-extrabold mt-1">{score}%</div>
                        <div className="text-white/90 text-xs mt-1 tracking-wide">{TIER_LABEL[tier!]}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-extrabold mt-1">—</div>
                        <div className="text-xs mt-1 tracking-wide font-semibold">
                          NOT SUBMITTED
                        </div>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selected && (
        <HistoryOverlay
          student={selected}
          allResults={Array.isArray(allResults) ? allResults : []}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default PerformanceMatrix;







