import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { mockUsers } from '../../data/mockData';
import { User, Role, PerformanceTier, LessonSubmission, CustomLessonSubmission } from '../../types';
import Card from '../../components/ui/Card';
import { TIER_THRESHOLDS, TIER_COLORS } from '../../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User as UserIcon, Bell, CheckCircle, Clock } from 'lucide-react';

const getPerformanceTier = (score: number): PerformanceTier => {
  if (score >= TIER_THRESHOLDS[PerformanceTier.MASTERED]) return PerformanceTier.MASTERED;
  if (score >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]) return PerformanceTier.DEVELOPING;
  return PerformanceTier.NEEDS_SUPPORT;
};

// Nicely pull something like "Chapter 3" from a title (fallback to last chunk after " - ").
const chapterLabel = (title = '') => {
  const m = title.match(/Chapter\s*\d+/i);
  if (m) return m[0].replace(/\s+/g, ' ').trim();
  const parts = title.split(' - ');
  return parts.length ? parts[parts.length - 1] : title || '—';
};

interface GradedAssessmentItem {
  type: 'Assessment';
  id: string;
  assessmentId: string;
  title: string;
  subject: string;
  tier: PerformanceTier;
  assignedTasks: string;
  submission: LessonSubmission | undefined;
  score: number;
  status: 'Graded';
  timestamp: number;
}
interface PendingAssessmentItem {
  type: 'Assessment';
  id: string;
  assessmentId: string;
  title: string;
  subject: string;
  status: 'Pending Grade';
  timestamp: number;
}
interface CustomLessonItem {
  type: 'Lesson';
  id: string;
  lessonId: string;
  title: string;
  subject: string;
  status: 'Submitted' | 'Graded';
  grade?: number;
  timestamp: number;
}
type ChildItem = GradedAssessmentItem | PendingAssessmentItem | CustomLessonItem;

const ParentDashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const dataContext = useContext(DataContext);
  const parent = authContext?.user as User;

  const childData = useMemo(() => {
    if (!parent || !parent.childIds || parent.childIds.length === 0 || !dataContext) return null;
    const childId = parent.childIds[0];
    const child = mockUsers.find(u => u.userId === childId);
    if (!child) return null;

    const {
      assessments,
      assessmentResults,
      assessmentSubmissions,
      lessonSubmissions,
      lessonPlans,
      notifications,
      customLessons,
      customLessonSubmissions,
    } = dataContext;

    const gradedAssessments: GradedAssessmentItem[] = assessmentResults
      .filter(r => r.studentId === childId)
      .map(result => {
        const assessment = assessments.find(a => a.assessmentId === result.assessmentId);
        const lessonPlan = lessonPlans.find(lp => lp.assessmentId === result.assessmentId);
        const tier = getPerformanceTier(result.score);
        let assignedTasks = '';
        if (lessonPlan) {
          if (tier === PerformanceTier.MASTERED) assignedTasks = lessonPlan.masteryTasks.tasks;
          else if (tier === PerformanceTier.DEVELOPING) assignedTasks = lessonPlan.developingTasks.tasks;
          else assignedTasks = lessonPlan.needsSupportTasks.tasks;
        }
        const submission = lessonSubmissions.find(
          s => s.assessmentId === result.assessmentId && s.studentId === childId
        );

        return {
          type: 'Assessment',
          id: result.resultId,
          assessmentId: result.assessmentId,
          title: assessment?.title || 'Unknown Assessment',
          subject: assessment?.subject || 'N/A',
          tier,
          assignedTasks,
          submission,
          score: result.score,
          status: 'Graded',
          timestamp: result.timestamp,
        };
      });

    const pendingAssessments: PendingAssessmentItem[] = assessmentSubmissions
      .filter(sub => sub.studentId === childId && sub.status === 'pending')
      .map(sub => {
        const assessment = assessments.find(a => a.assessmentId === sub.assessmentId);
        return {
          type: 'Assessment',
          id: sub.submissionId,
          assessmentId: sub.assessmentId,
          title: assessment?.title || 'Unknown Assessment',
          subject: assessment?.subject || 'N/A',
          status: 'Pending Grade',
          timestamp: Date.now(),
        };
      });

    const childCustomLessons: CustomLessonItem[] = customLessonSubmissions
      .filter(s => s.studentId === childId)
      .map(sub => {
        const lesson = customLessons.find(l => l.lessonId === sub.lessonId);
        return {
          type: 'Lesson',
          id: sub.submissionId,
          lessonId: sub.lessonId,
          title: lesson?.title || 'Custom Lesson',
          subject: lesson?.subject || 'N/A',
          status: sub.status === 'graded' ? 'Graded' : 'Submitted',
          grade: sub.grade,
          timestamp: sub.timestamp,
        };
      });

    const allItems: ChildItem[] = [...gradedAssessments, ...pendingAssessments, ...childCustomLessons].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Two time series: Science and Math
    const gradedAsc = gradedAssessments.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const chartDataScience = gradedAsc
      .filter(g => (g.subject || '').toLowerCase().includes('science'))
      .map(g => ({ name: chapterLabel(g.title), score: g.score }));

    const chartDataMath = gradedAsc
      .filter(g => {
        const s = (g.subject || '').toLowerCase();
        return s.includes('math');
      })
      .map(g => ({ name: chapterLabel(g.title), score: g.score }));

    const parentNotifications = notifications.filter(n => n.userId === parent.userId);

    return { child, allItems, chartDataScience, chartDataMath, notifications: parentNotifications };
  }, [parent, dataContext]);

  if (!parent || parent.role !== Role.PARENT) return <div className="p-8">Access Denied</div>;
  if (!childData) return <div className="p-8">Loading child data...</div>;

  const { child, allItems, chartDataScience, chartDataMath, notifications } = childData;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <Card className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full border-4 border-gold-accent bg-gray-200 flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-gray-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-royal-blue">Parent Dashboard</h2>
            <p className="text-gray-600">
              Viewing progress for <span className="font-semibold">{child.name}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Notifications moved here */}
      <Card className="mb-6">
        <h3 className="text-xl font-bold text-royal-blue mb-4 flex items-center">
          <Bell className="mr-2" />
          Notifications
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`text-sm p-2 rounded ${n.isRead ? 'text-gray-500' : 'font-semibold text-gray-800 bg-blue-50'}`}
            >
              {n.message}
            </div>
          ))}
          {notifications.length === 0 && <p className="text-sm text-gray-500">No new notifications.</p>}
        </div>
      </Card>

      {/* Recent work (left) + Charts (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Recent Work & Tasks</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {allItems.map(item => (
                <div key={item.id} className="p-4 rounded-lg border border-gray-200 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.subject}</p>
                    </div>
                    {item.status === 'Graded' ? (
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          item.type === 'Assessment' ? TIER_COLORS[(item as GradedAssessmentItem).tier] : 'bg-royal-blue text-white'
                        }`}
                      >
                        {item.type === 'Assessment' ? `${(item as GradedAssessmentItem).score}%` : `${(item as CustomLessonItem).grade}%`}
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-200 text-gray-700">
                        {item.status}
                      </div>
                    )}
                  </div>

                  {item.type === 'Assessment' &&
                    item.status === 'Graded' &&
                    (item as GradedAssessmentItem).assignedTasks && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-semibold text-gray-700">Follow-up Task:</p>
                        <p className="text-sm text-gray-600">{(item as GradedAssessmentItem).assignedTasks}</p>
                        <div className="text-xs font-semibold mt-2 flex items-center">
                          {(item as GradedAssessmentItem).submission ? (
                            (item as GradedAssessmentItem).submission!.status === 'graded' ? (
                              <span
                                className={`flex items-center px-2 py-1 rounded-full ${
                                  (item as GradedAssessmentItem).submission!.grade === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                <CheckCircle size={14} className="mr-1" /> Graded:{' '}
                                {(item as GradedAssessmentItem).submission!.grade}
                              </span>
                            ) : (
                              <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                <Clock size={14} className="mr-1" /> Submitted for review
                              </span>
                            )
                          ) : (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              Pending Submission
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Science Progress</h3>
            {chartDataScience.length === 0 ? (
              <p className="text-sm text-gray-500">No assessments yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartDataScience} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#D4AF37" strokeWidth={3} name="Score %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Math Progress</h3>
            {chartDataMath.length === 0 ? (
              <p className="text-sm text-gray-500">No assessments yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartDataMath} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#D4AF37" strokeWidth={3} name="Score %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
