
import React, { useState, useMemo, useContext, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { Role, PerformanceTier, User } from '../../types';
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
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
    const dashboardRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const teachers = useMemo(() => mockUsers.filter(u => u.role === Role.TEACHER), []);

    const schoolData = useMemo(() => {
        if (!dataContext) return null;
        let { assessments, assessmentResults: results } = dataContext;

        if (selectedTeacherId !== 'all') {
            assessments = assessments.filter(a => a.teacherId === selectedTeacherId);
            const assessmentIds = assessments.map(a => a.assessmentId);
            results = results.filter(r => assessmentIds.includes(r.assessmentId));
        }

        const gradeAverages = assessments.reduce((acc, assessment) => {
            const gradeResults = results.filter(r => r.assessmentId === assessment.assessmentId);
            if (gradeResults.length > 0) {
                const totalScore = gradeResults.reduce((sum, r) => sum + r.score, 0);
                const avg = totalScore / gradeResults.length;
                const gradeKey = `Grade ${assessment.grade}`;
                if (!acc[gradeKey]) {
                    acc[gradeKey] = { total: 0, count: 0 };
                }
                acc[gradeKey].total += avg;
                acc[gradeKey].count += 1;
            }
            return acc;
        }, {} as { [grade: string]: { total: number, count: number } });

        const gradeChartData = Object.entries(gradeAverages).map(([grade, data]) => ({
            name: grade,
            average: data.total / data.count,
        }));

        const subjectAverages = assessments.reduce((acc, assessment) => {
            const subjectResults = results.filter(r => r.assessmentId === assessment.assessmentId);
             if (subjectResults.length > 0) {
                const totalScore = subjectResults.reduce((sum, r) => sum + r.score, 0);
                const avg = totalScore / subjectResults.length;
                const subjectKey = assessment.subject;
                if (!acc[subjectKey]) {
                    acc[subjectKey] = { total: 0, count: 0 };
                }
                acc[subjectKey].total += avg;
                acc[subjectKey].count += 1;
            }
            return acc;
        }, {} as { [subject: string]: { total: number, count: number }});

        const subjectChartData = Object.entries(subjectAverages).map(([subject, data]) => ({
            name: subject,
            average: data.total / data.count,
        }));


        const tierCounts = {
            [PerformanceTier.MASTERED]: 0,
            [PerformanceTier.DEVELOPING]: 0,
            [PerformanceTier.NEEDS_SUPPORT]: 0,
        };
        
        results.forEach(result => {
            if (result.score >= TIER_THRESHOLDS[PerformanceTier.MASTERED]) tierCounts[PerformanceTier.MASTERED]++;
            else if (result.score >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]) tierCounts[PerformanceTier.DEVELOPING]++;
            else tierCounts[PerformanceTier.NEEDS_SUPPORT]++;
        });

        const pieData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));
        
        const teacherActivity = teachers.map(teacher => ({
            name: teacher.name,
            assessmentCount: dataContext.assessments.filter(a => a.teacherId === teacher.userId).length
        })).sort((a,b) => b.assessmentCount - a.assessmentCount);

        return { gradeChartData, subjectChartData, pieChartData: pieData, teacherActivity };
    }, [dataContext, selectedTeacherId, teachers]);

    const handleDownloadReport = () => {
        const input = dashboardRef.current;
        if (input) {
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
        }
    };

    if (!principal || principal.role !== Role.PRINCIPAL) return <div className="p-8">Access Denied</div>;
    if (!schoolData) return <div className="p-8">Loading data...</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
             <div ref={dashboardRef}>
                <Card className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-royal-blue">Principal's Executive Dashboard</h2>
                        <p className="text-gray-600">High-level overview of school performance.</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                        <div>
                            <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">Filter by Teacher</label>
                            <select
                                id="class-select"
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm rounded-md"
                            >
                                <option value="all">School-Wide</option>
                                {teachers.map(t => <option key={t.userId} value={t.userId}>{t.name}'s Class</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <SchoolPerformanceCharts gradeData={schoolData.gradeChartData} subjectData={schoolData.subjectChartData} pieData={schoolData.pieChartData} />
                    </div>
                    
                    <div className="space-y-6">
                        <Card>
                            <h3 className="text-xl font-bold text-royal-blue mb-4">Teacher Activity</h3>
                            <ul className="space-y-3">
                                {schoolData.teacherActivity.map(teacher => (
                                    <li key={teacher.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                        <div className="flex items-center space-x-3">
                                            <UserIcon className="h-5 w-5 text-gray-500" />
                                            <span className="font-medium text-gray-700">{teacher.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-royal-blue">{teacher.assessmentCount}</span>
                                            <BookCopy className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        <Card>
                            <h3 className="text-xl font-bold text-royal-blue mb-4">KHDA Reporting</h3>
                            <p className="text-gray-600 mb-4">Generate a school-wide performance report as a PDF document for regulatory bodies.</p>
                            <button
                                onClick={handleDownloadReport}
                                disabled={isDownloading}
                                className="w-full rounded-md bg-gold-accent px-4 py-2 text-base font-bold text-royal-blue shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-royal-blue focus:ring-offset-2 flex items-center justify-center disabled:opacity-50"
                            >
                                <Download className="mr-2 h-5 w-5"/>
                                {isDownloading ? 'Generating...' : 'Download Report'}
                            </button>
                        </Card>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report Generated">
                <p className="text-gray-700">The school performance report has been successfully downloaded.</p>
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
