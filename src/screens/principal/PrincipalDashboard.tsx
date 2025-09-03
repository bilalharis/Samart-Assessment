import React, { useState, useMemo, useContext, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { Role, PerformanceTier } from '../../types';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { TIER_THRESHOLDS } from '../../constants';
import SchoolPerformanceCharts from './SchoolPerformanceCharts';
import { mockUsers } from '../../data/mockData';
import { User as UserIcon, BookCopy, Download } from 'lucide-react';

const PrincipalDashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const dataContext = useContext(DataContext);
  const principal = authContext?.user;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const teachers = useMemo(() => mockUsers.filter(u => u.role === Role.TEACHER), []);

  const schoolData = useMemo(() => {
    if (!dataContext) return null;

    const { assessments, assessmentResults: allResults } = dataContext;

    // Average by subject (bars)
    const subjectAgg = assessments.reduce((acc, a) => {
      const rs = allResults.filter(r => r.assessmentId === a.assessmentId);
      if (!rs.length) return acc;
      const avg = rs.reduce((s, r) => s + (r.score ?? 0), 0) / rs.length;
      acc[a.subject] = acc[a.subject]
        ? { total: acc[a.subject].total + avg, count: acc[a.subject].count + 1 }
        : { total: avg, count: 1 };
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const subjectChartData = Object.entries(subjectAgg).map(([name, v]) => ({
      name,
      average: v.total / v.count,
    }));

    const getTierCounts = (scores: number[]) => {
      const counts = { mastered: 0, developing: 0, support: 0 };
      for (const s of scores) {
        if (s >= TIER_THRESHOLDS[PerformanceTier.MASTERED]) counts.mastered++;
        else if (s >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]) counts.developing++;
        else counts.support++;
      }
      return counts;
    };

    const chapterOf = (title = '') => {
      const m = title.match(/Chapter\s*(\d+)/i);
      return m ? Number(m[1]) : 0;
    };

    const subjectResults = (subjectKey: string) =>
      allResults.filter(r => {
        const a = assessments.find(x => x.assessmentId === r.assessmentId);
        return (a?.subject || '').toLowerCase().includes(subjectKey.toLowerCase());
      });

    const trendFor = (subjectKey: string) => {
      const map = new Map<number, number[]>();
      for (const a of assessments) {
        if (!(a.subject || '').toLowerCase().includes(subjectKey.toLowerCase())) continue;
        const ch = chapterOf(a.title || '');
        const rs = allResults.filter(r => r.assessmentId === a.assessmentId).map(r => r.score ?? 0);
        if (!rs.length) continue;
        map.set(ch, (map.get(ch) || []).concat(rs));
      }
      const out = [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ch, arr]) => ({
          name: `Chapter ${ch}`,
          score: Math.round(arr.reduce((s, n) => s + n, 0) / arr.length),
        }));
      return out.length ? out : [{ name: 'Chapter 1', score: 0 }];
    };

    // Pies
    const allScores = allResults.map(r => r.score ?? 0);
    const scienceScores = subjectResults('science').map(r => r.score ?? 0);
    const mathScores = subjectResults('math').map(r => r.score ?? 0);

    const pieAll = getTierCounts(allScores);
    const pieScience = getTierCounts(scienceScores);
    const pieMath = getTierCounts(mathScores);

    const scienceTrend = trendFor('science');
    const mathTrend = trendFor('math');

    const teacherActivity = teachers
      .map(t => ({
        name: t.name,
        assessmentCount: assessments.filter(a => a.teacherId === t.userId).length,
      }))
      .sort((a, b) => b.assessmentCount - a.assessmentCount);

    return {
      subjectChartData,
      pies: { overall: pieAll, science: pieScience, math: pieMath }, // important: "overall"
      trends: { science: scienceTrend, math: mathTrend },
      teacherActivity,
    };
  }, [dataContext, teachers]);

  const handleDownloadReport = () => {
    const el = dashboardRef.current;
    if (!el) return;
    setIsDownloading(true);
    html2canvas(el, { scale: 2 }).then(canvas => {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save('school-performance-report.pdf');
      setIsDownloading(false);
      setIsModalOpen(true);
    });
  };

  const principalOk = principal && principal.role === Role.PRINCIPAL;
  if (!principalOk) return <div className="p-8">Access Denied</div>;
  if (!schoolData) return <div className="p-8">Loading data...</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div ref={dashboardRef}>
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-royal-blue">Principal&apos;s Executive Dashboard</h2>
          <p className="text-gray-600">High-level overview of school performance.</p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Teacher Activity</h3>
            <ul className="space-y-3">
              {schoolData.teacherActivity.map(t => (
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
            <p className="text-gray-600 mb-4">Generate a school-wide performance report as a PDF.</p>
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

        <SchoolPerformanceCharts
          subjectData={schoolData.subjectChartData}
          scienceSeries={schoolData.trends.science}
          mathSeries={schoolData.trends.math}
          pies={schoolData.pies}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report Generated">
        <p className="text-gray-700">The school performance report has been downloaded.</p>
        <div className="mt-6 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded-md bg-royal-blue px-4 py-2 text-sm font-medium text-white">
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PrincipalDashboard;






