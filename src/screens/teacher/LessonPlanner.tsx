import React, { useState, useMemo, useContext, useRef, useLayoutEffect, useEffect } from 'react';
import { AssessmentResult, User, PerformanceTier, LessonPlan } from '../../types';
import { TIER_THRESHOLDS, TIER_BORDERS } from '../../constants';
import Card from '../../components/ui/Card';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { CheckCircle } from 'lucide-react';

interface LessonPlannerProps {
  students: User[];
  results: AssessmentResult[];
  existingPlan?: LessonPlan;
  assessmentId: string;
}

const getPerformanceTier = (score: number): PerformanceTier => {
  if (score >= TIER_THRESHOLDS[PerformanceTier.MASTERED]) return PerformanceTier.MASTERED;
  if (score >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]) return PerformanceTier.DEVELOPING;
  return PerformanceTier.NEEDS_SUPPORT;
};

/* ---------- Separate, memoized child to keep focus ---------- */
type GPProps = {
  title: string;
  tier: PerformanceTier;
  students: User[];
  tasks: string;
  setTasks: (v: string) => void;
};

const GroupPlanner = React.memo(function GroupPlanner({
  title,
  tier,
  students,
  tasks,
  setTasks,
}: GPProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // auto-size without breaking focus
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [tasks]);

  return (
    <div className={`rounded-lg p-4 border-l-4 ${TIER_BORDERS[tier]}`}>
      <h4 className="text-lg font-bold text-royal-blue">
        {title} ({students.length})
      </h4>

      <div className="flex flex-wrap gap-2 my-2">
        {students.map(s => (
          <span
            key={s.userId}
            className="bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
          >
            {s.name}
          </span>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={tasks}
        onChange={(e) => setTasks(e.target.value)}
        rows={2}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-royal-blue focus:border-royal-blue bg-white shadow-inner resize-none overflow-hidden"
        placeholder={`Enter tasks or link resources for the ${title.toLowerCase()}...`}
      />
    </div>
  );
});
/* ------------------------------------------------------------ */

const LessonPlanner: React.FC<LessonPlannerProps> = ({ students, results, existingPlan, assessmentId }) => {
  const authContext = useContext(AuthContext);
  const dataContext = useContext(DataContext);

  const [masteryTasks, setMasteryTasks] = useState(existingPlan?.masteryTasks.tasks || '');
  const [developingTasks, setDevelopingTasks] = useState(existingPlan?.developingTasks.tasks || '');
  const [needsSupportTasks, setNeedsSupportTasks] = useState(existingPlan?.needsSupportTasks.tasks || '');
  const [isSent, setIsSent] = useState(false);

  const studentGroups = useMemo(() => {
    const groups: { [key in PerformanceTier]: User[] } = {
      [PerformanceTier.MASTERED]: [],
      [PerformanceTier.DEVELOPING]: [],
      [PerformanceTier.NEEDS_SUPPORT]: [],
    };
    students.forEach(student => {
      const result = results.find(r => r.studentId === student.userId);
      if (result) groups[getPerformanceTier(result.score)].push(student);
    });
    return groups;
  }, [students, results]);

  // Enable only if any field has text
  const canSend = useMemo(
    () =>
      (masteryTasks || '').trim().length > 0 ||
      (developingTasks || '').trim().length > 0 ||
      (needsSupportTasks || '').trim().length > 0,
    [masteryTasks, developingTasks, needsSupportTasks]
  );

  // If teacher edits after sending, flip label back to "Send Activity"
  useEffect(() => {
    setIsSent(false);
  }, [masteryTasks, developingTasks, needsSupportTasks]);

  const handleSendActivity = () => {
    if (!dataContext?.addLessonPlan || !canSend) return;

    const newPlan: LessonPlan = {
      planId: existingPlan?.planId || `plan-${assessmentId}`,
      teacherId: authContext?.user?.userId || 'teacher-1',
      assessmentId,
      masteryTasks: { students: studentGroups[PerformanceTier.MASTERED].map(s => s.userId), tasks: masteryTasks },
      developingTasks: { students: studentGroups[PerformanceTier.DEVELOPING].map(s => s.userId), tasks: developingTasks },
      needsSupportTasks: { students: studentGroups[PerformanceTier.NEEDS_SUPPORT].map(s => s.userId), tasks: needsSupportTasks },
      iepConsidered: existingPlan?.iepConsidered ?? true,
    };

    dataContext.addLessonPlan(newPlan);
    setIsSent(true);
  };

  return (
    <Card>
      <h3 className="text-xl font-bold text-royal-blue mb-4">Activity Planner</h3>

      <div className="space-y-6">
        <GroupPlanner
          title="Mastery Group"
          tier={PerformanceTier.MASTERED}
          students={studentGroups[PerformanceTier.MASTERED]}
          tasks={masteryTasks}
          setTasks={setMasteryTasks}
        />
        <GroupPlanner
          title="Developing Group"
          tier={PerformanceTier.DEVELOPING}
          students={studentGroups[PerformanceTier.DEVELOPING]}
          tasks={developingTasks}
          setTasks={setDevelopingTasks}
        />
        <GroupPlanner
          title="Needs Support Group"
          tier={PerformanceTier.NEEDS_SUPPORT}
          students={studentGroups[PerformanceTier.NEEDS_SUPPORT]}
          tasks={needsSupportTasks}
          setTasks={setNeedsSupportTasks}
        />

        <div className="flex justify-end">
          <button
            onClick={handleSendActivity}
            disabled={!canSend}
            className={`flex items-center justify-center rounded-md px-6 py-3 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2
              ${!canSend ? 'bg-royal-blue/60 cursor-not-allowed' : 'bg-royal-blue hover:bg-opacity-90'}`}
          >
            {isSent ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Activity Sent
              </>
            ) : (
              'Send Activity'
            )}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default LessonPlanner;

