import React, { useState, useMemo, useContext, useRef, useLayoutEffect } from 'react';
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
  const [isSaved, setIsSaved] = useState(false);

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

  const handleSavePlan = () => {
    if (!dataContext?.addLessonPlan) return;

    const newPlan: LessonPlan = {
      planId: existingPlan?.planId || `plan-${assessmentId}`,
      teacherId: authContext?.user?.userId || 'teacher-1',
      assessmentId,
      masteryTasks: { students: studentGroups[PerformanceTier.MASTERED].map(s => s.userId), tasks: masteryTasks },
      developingTasks: { students: studentGroups[PerformanceTier.DEVELOPING].map(s => s.userId), tasks: developingTasks },
      needsSupportTasks: { students: studentGroups[PerformanceTier.NEEDS_SUPPORT].map(s => s.userId), tasks: needsSupportTasks },
      // keep type happy; field is not shown in UI
      iepConsidered: existingPlan?.iepConsidered ?? true,
    };

    dataContext.addLessonPlan(newPlan);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <Card>
      <h3 className="text-xl font-bold text-royal-blue mb-4">Differentiated Lesson Planner</h3>

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
            onClick={handleSavePlan}
            className="flex items-center justify-center rounded-md bg-royal-blue px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2"
          >
            {isSaved ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Plan Saved!
              </>
            ) : (
              'Save Lesson Plan'
            )}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default LessonPlanner;

