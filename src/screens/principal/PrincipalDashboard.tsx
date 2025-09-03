import React, { useState, useMemo, useContext, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { Role, PerformanceTier } from '../../types';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { TIER_THRESHOLDS } from '../../constants';
import { mockUsers } from '../../data/mockData';
import { User as UserIcon, BookCopy, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  Cell,
} from 'recharts';

/* ---------------- small helpers ---------------- */
const getChapterLabel = (title: string) => {
  const m = title?.match(/Chapter\s*\d+/i);
  if (m) return m[0].replace(/\s+/g, ' ').trim();
  const parts = (title || '').split(' - ');
  return (parts[parts.length - 1] || title || '').trim();
};

const tierOf = (score: number): PerformanceTier =>
  score >= TIER_THRESHOLDS[PerformanceTier.MASTERED]
    ? PerformanceTier.MASTERED
    : score >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]
    ? PerformanceTier.DEVELOPING
    : PerformanceTier.NEEDS_SUPPORT;

/* ---------------- Donut (same look as Teacher dashboard) ---------------- */
const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(end));
  const sy = cy + r * Math.sin(toRad(end));
  const ex = cx + r * Math.cos(toRad(start));
  const ey = cy + r * Math.sin(toRad(start));
  const large = end - start <= 180 ? 0 : 1;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 0 ${ex} ${ey}`;
};

const DistributionDonut: React.FC<{
  mastered: number;
  developing: number;
  support: number;
}> = ({ mastered, developing, support }) => {
  const total = Math.max(0, mastered + developing + support);
  const segs = [
    { label: 'Mastered', value: mastered, color: '#15803d' },
    { label: 'Developing', value: developing, color: '#f59e0b' },
    { label: 'Needs Support', value: support, color: '#dc2626' },
  ];

  const W = 360;
  const H = 180;
  const cx = 90;
  const cy = 90;
  const outer = 68;
  const inner = 42;

  let angle = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* base ring */}
        <circle cx={cx} cy={cy} r={outer} fill="none" stroke="#e5e7eb" strokeWidth={outer - inner} />
        {/* segments */}
        {segs.map((s, i) => {
          const sweep = total ? (s.value / total) * 360 : 0;
          const start = angle;
          const end = angle + sweep;
          angle += sweep;
          return (
            <path
              key={i}
              d={arcPath(cx, cy, (outer + inner) / 2, start, end)}
              stroke={s.color}
              strokeWidth={outer - inner}
              strokeLinecap="butt"
              fill="none"
            />
          );
        })}
      </svg>

      <div className="space-y-2">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center text-sm text-gray-700">
            <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: s.color }} />
            {s.label} — <span className="ml-1 font-semibold">{s.value}</span>
          </div>
        ))}
        <div className="text-xs text-gray-500 mt-1">Total students: {total}</div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------------- */

const PrincipalDashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const dataContext = useContext(DataContext);
  const principal = authContext?.user;
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const teachers = useMemo(() => mockUsers.filter((u) => u.role === Role.TEACHER), []);

  const schoolData = useMemo(() => {
    if (!dataContext) return null;
    const { assessments, assessmentResults } = dataContext;

    // --- Subject bar data (Science/Math)
    const subjectAgg: Record<string, { total: number; count: number }> = {};
    assessments.forEach((a) => {
      const results = assessmentResults.filter((r) => r.assessmentId === a.assessmentId);
      if (!results.length) return;
      const avg = results.reduce((s, r) => s + (r.score ?? 0), 0) / results.length;
      const key = a.subject;
      if (!subjectAgg[key]) subjectAgg[key] = { total: 0, count: 0 };
      subjectAgg[key].total += avg;
      subjectAgg[key].count += 1;
    });
    const subjectChartData = Object.entries(subjectAgg).map(([name, v]) => ({
      name,
      average: v.count ? v.total / v.count : 0,
    }));

    // --- Progress per subject: average by chapter (label)
    const bySubjectChapter: Record<string, Record<string, { total: number; count: number }>> = {};
    assessments.forEach((a) => {
      const chapter = getChapterLabel(a.title);
      const results = assessmentResults.filter((r) => r.assessmentId === a.assessmentId);
      if (!results.length) return;
      const avg = results.reduce((s, r) => s + (r.score ?? 0), 0) / results.length;

      if (!bySubjectChapter[a.subject]) bySubjectChapter[a.subject] = {};
      if (!bySubjectChapter[a.subject][chapter]) bySubjectChapter[a.subject][chapter] = { total: 0, count: 0 };
      bySubjectChapter[a.subject][chapter].total += avg;
      bySubjectChapter[a.subject][chapter].count += 1;
    });

    const scienceProgress =
      Object.entries(bySubjectChapter['Science'] || {}).map(([ch, v]) => ({
        chapter: ch,
        score: v.count ? Math.round(v.total / v.count) : 0,
      })) || [];

    const mathProgress =
      Object.entries(bySubjectChapter['Math'] || {}).map(([ch, v]) => ({
        chapter: ch,
        score: v.count ? Math.round(v.total / v.count) : 0,
      })) || [];

    // --- Donut counts (overall + per subject)
    const countTiers = (results: typeof assessmentResults) => {
      let mastered = 0,
        developing = 0,
        support = 0;
      results.forEach((r) => {
        const t = tierOf(r.score ?? 0);
        if (t === PerformanceTier.MASTERED) mastered += 1;
        else if (t === PerformanceTier.DEVELOPING) developing += 1;
        else support += 1;
      });
      return { mastered, developing, support };
    };

    const overallCounts = countTiers(assessmentResults);
    const sciIds = assessments.filter((a) => /science/i.test(a.subject)).map((a) => a.assessmentId);
    const mathIds = assessments.filter((a) => /math/i.test(a.subject)).map((a) => a.assessmentId);

    const scienceCounts = countTiers(assessmentResults.filter((r) => sciIds.includes(r.assessmentId)));
    const mathCounts = countTiers(assessmentResults.filter((r) => mathIds.includes(r.assessmentId)));

    // --- Teacher activity (unchanged)
    const teacherActivity = teachers
      .map((t) => ({
        name: t.name,
        assessmentCount: assessments.filter((a) => a.teacherId === t.userId).length,
      }))
      .sort((a, b) => b.assessmentCount - a.assessmentCount);

    return {
      subjectChartData,
      scienceProgress,
      mathProgress,
      overallCounts,
      scienceCounts,
      mathCounts,
      teacherActivity,
    };
  }, [dataContext, teachers]);

  const handleDownloadReport = () => {
    const input = dashboardRef.current;
    if (!input) return;
    setIsDownloading(true);
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('school-performance-report.pdf');
      setIsDownloading(false);
      setIsModalOpen(true);
    });
  };

  if (!principal || principal.role !== Role.PRINCIPAL) return <div className="p-8">Access Denied</div>;
  if (!schoolData) return <div className="p-8">Loading data...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div ref={dashboardRef}>
        {/* Header */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-royal-blue">Principal&apos;s Executive Dashboard</h2>
          <p className="text-gray-600">High-level overview of school performance.</p>
        </Card>

        {/* === Row 1: Average by Subject (Bar) + Donut ===================== */}
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-royal-blue mb-4">Average Scores by Subject</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={schoolData.subjectChartData}
                  margin={{ top: 12, right: 20, left: -10, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  {/* no legend label to keep UI clean */}
                  <Bar dataKey="average">
                    {schoolData.subjectChartData.map((d: any, idx: number) => (
                      <Cell
                        key={`c-${idx}`}
                        fill={/science/i.test(d.name) ? '#143F8C' : '#D4AF37'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <DistributionDonut
              mastered={schoolData.overallCounts.mastered}
              developing={schoolData.overallCounts.developing}
              support={schoolData.overallCounts.support}
            />
          </div>
        </Card>

        {/* === Row 2: Science Progress (Line) + Donut ====================== */}
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-royal-blue mb-4">Science Progress</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={schoolData.scienceProgress}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="chapter" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#143F8C" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <DistributionDonut
              mastered={schoolData.scienceCounts.mastered}
              developing={schoolData.scienceCounts.developing}
              support={schoolData.scienceCounts.support}
            />
          </div>
        </Card>

        {/* === Row 3: Math Progress (Line) + Donut ========================= */}
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-royal-blue mb-4">Math Progress</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={schoolData.mathProgress}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="chapter" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#D4AF37" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <DistributionDonut
              mastered={schoolData.mathCounts.mastered}
              developing={schoolData.mathCounts.developing}
              support={schoolData.mathCounts.support}
            />
          </div>
        </Card>

        {/* === Row 4: Activity + KHDA (separate row) ======================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Teacher Activity</h3>
            <ul className="space-y-3">
              {schoolData.teacherActivity.map((t) => (
                <li key={t.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-700">{t.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-royal-blue">{t.assessmentCount}</span>
                    <BookCopy className="h-5 w-5 text-gray-400" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">KHDA Reporting</h3>
            <p className="text-gray-600 mb-4">
              Generate a school-wide performance report as a PDF document for regulatory bodies.
            </p>
            <button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="w-full rounded-md bg-gold-accent px-4 py-2 text-base font-bold text-royal-blue shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-royal-blue focus:ring-offset-2 flex items-center justify-center disabled:opacity-50"
            >
              <Download className="mr-2 h-5 w-5" />
              {isDownloading ? 'Generating...' : 'Download Report'}
            </button>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report Generated">
        <p className="text-gray-700">The school performance report has been successfully downloaded.</p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setIsModalOpen(false)}
            className="rounded-md bg-royal-blue px-4 py-2 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PrincipalDashboard;





