import React, { createContext, useState, ReactNode } from 'react';
import {
  Assessment,
  AssessmentResult,
  LessonPlan,
  LessonSubmission,
  Notification,
  Role,
  AssessmentSubmission,
  CustomLesson,
  CustomLessonSubmission
} from '../types';
import {
  mockAssessments,
  mockAssessmentResults,
  mockLessonSubmissions,
  mockNotifications,
  mockUsers,
  mockLessonPlans,
  mockAssessmentSubmissions,
  mockCustomLessons,
  mockCustomLessonSubmissions
} from '../data/mockData';

interface DataContextType {
  assessments: Assessment[];
  assessmentResults: AssessmentResult[];
  assessmentSubmissions: AssessmentSubmission[];
  lessonPlans: LessonPlan[];
  lessonSubmissions: LessonSubmission[];
  notifications: Notification[];
  customLessons: CustomLesson[];
  customLessonSubmissions: CustomLessonSubmission[];

  // CRUD
  addAssessment: (assessment: Assessment) => void;
  updateAssessment: (assessment: Assessment) => void;
  getAssessmentById: (id: string) => Assessment | undefined;

  addAssessmentResult: (
    result: Omit<AssessmentResult, 'resultId'>,
    studentName: string,
    assessmentTitle: string
  ) => void;
  addAssessmentSubmission: (
    submissionData: Omit<AssessmentSubmission, 'submissionId' | 'status' | 'score'>
  ) => void;

  // ⬇️ now supports teacher remarks
  gradeAssessment: (submissionId: string, score: number, feedback?: string) => void;

  addLessonSubmission: (
    submission: Omit<LessonSubmission, 'submissionId' | 'timestamp'>,
    studentName: string,
    assessmentTitle: string
  ) => void;
  addLessonPlan: (plan: LessonPlan) => void;
  gradeSubmission: (submissionId: string, grade: 'approved' | 'needs_revision', feedback: string) => void;

  readNotification: (notificationId: string) => void;

  addCustomLesson: (lesson: Omit<CustomLesson, 'lessonId'>) => void;
  addCustomLessonSubmission: (
    submission: Omit<CustomLessonSubmission, 'submissionId' | 'status' | 'timestamp'>
  ) => void;
  gradeCustomLessonSubmission: (submissionId: string, grade: number, feedback: string) => void;

  // Edit bridge
  editingAssessmentId: string | null;
  startEditingAssessment: (assessmentId: string) => void;
  clearEditingAssessment: () => void;
}

export const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [assessments, setAssessments] = useState<Assessment[]>(mockAssessments);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>(mockAssessmentResults);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState<AssessmentSubmission[]>(
    mockAssessmentSubmissions
  );
  const [lessonSubmissions, setLessonSubmissions] = useState<LessonSubmission[]>(mockLessonSubmissions);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>(mockLessonPlans);
  const [customLessons, setCustomLessons] = useState<CustomLesson[]>(mockCustomLessons);
  const [customLessonSubmissions, setCustomLessonSubmissions] = useState<CustomLessonSubmission[]>(
    mockCustomLessonSubmissions
  );

  // Which assessment is being edited
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    setNotifications(prev => [{ ...notification, id: `notif-${Date.now()}` }, ...prev]);
  };

  /**
   * Helper: when a teacher creates/updates an assessment, notify their class.
   */
  const notifyClassOfAssessment = (assessment: Assessment) => {
    const classStudents = mockUsers.filter(
      u => u.role === Role.STUDENT && u.classId === assessment.classId
    );
    if (classStudents.length === 0) return;

    classStudents.forEach((stu) => {
      // (Optional) You could notify students too — if your UI uses student notifications
      // addNotification({ userId: stu.userId, message: `New assessment: ${assessment.title}`, isRead: false });

      // Notify parent (used elsewhere in your app)
      const parent = mockUsers.find(p => p.role === Role.PARENT && p.childIds?.includes(stu.userId));
      if (parent) {
        addNotification({
          userId: parent.userId,
          message: `${stu.name} has a new assessment: ${assessment.title}.`,
          isRead: false,
        });
      }
    });
  };

  /**
   * Upsert (create or replace) + light normalization + notify class.
   */
  const addAssessment = (raw: Assessment) => {
    const normalized: Assessment = (() => {
      // try to fill missing teacherId/classId if omitted by a caller
      let teacherId = raw.teacherId;
      let classId = raw.classId;

      if (!teacherId) {
        // best effort: pick the subject teacher in the same class if any
        const teacher = mockUsers.find(
          u => u.role === Role.TEACHER && (u as any).subject === raw.subject
        );
        teacherId = teacher?.userId || raw.teacherId || 'teacher-1';
        classId = classId || (teacher as any)?.classId || raw.classId || 'class-1';
      }
      if (!classId) {
        const teacher = mockUsers.find(u => u.userId === teacherId);
        classId = (teacher as any)?.classId || 'class-1';
      }

      return {
        ...raw,
        teacherId,
        classId,
      };
    })();

    setAssessments(prev => {
      const i = prev.findIndex(a => a.assessmentId === normalized.assessmentId);
      const next = [...prev];
      if (i === -1) {
        next.push(normalized);
      } else {
        next[i] = normalized; // replace existing (edit)
      }
      return next;
    });

    notifyClassOfAssessment(normalized);
  };

  // Upsert explicit update (kept for callers that prefer 'updateAssessment')
  const updateAssessment = (assessment: Assessment) => {
    setAssessments(prev => {
      const i = prev.findIndex(a => a.assessmentId === assessment.assessmentId);
      if (i === -1) return [...prev, assessment];
      const next = [...prev];
      next[i] = assessment;
      return next;
    });

    notifyClassOfAssessment(assessment);
  };

  const getAssessmentById = (id: string) => assessments.find(a => a.assessmentId === id);

  // Upsert result for (assessmentId, studentId)
  const addAssessmentResult = (
    resultData: Omit<AssessmentResult, 'resultId'>,
    studentName: string,
    assessmentTitle: string
  ) => {
    setAssessmentResults(prev => {
      const idx = prev.findIndex(
        r => r.assessmentId === resultData.assessmentId && r.studentId === resultData.studentId
      );
      if (idx !== -1) {
        const old = prev[idx];
        const updated: AssessmentResult = {
          ...old,
          ...resultData,
          resultId: old.resultId,
          timestamp: resultData.timestamp ?? Date.now(),
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [
        ...prev,
        { ...resultData, resultId: `result-${Date.now()}` },
      ];
    });

    const student = mockUsers.find(s => s.userId === resultData.studentId);
    const parent = mockUsers.find(u => u.role === Role.PARENT && u.childIds?.includes(resultData.studentId));
    if (student && parent) {
      addNotification({
        userId: parent.userId,
        message: `Your child, ${studentName}, scored ${resultData.score}% on ${assessmentTitle}.`,
        isRead: false,
      });
    }
  };

  const addAssessmentSubmission = (
    submissionData: Omit<AssessmentSubmission, 'submissionId' | 'status' | 'score'>
  ) => {
    const student = mockUsers.find(s => s.userId === submissionData.studentId);
    const assessment = assessments.find(a => a.assessmentId === submissionData.assessmentId);
    if (!student || !assessment) return;

    const newSubmission: AssessmentSubmission = {
      ...submissionData,
      submissionId: `assess-sub-${Date.now()}`,
      status: 'pending',
    };
    setAssessmentSubmissions(prev => [...prev, newSubmission]);

    const teacher = mockUsers.find(u => u.role === Role.TEACHER && u.userId === assessment.teacherId);
    if (teacher) {
      addNotification({
        userId: teacher.userId,
        message: `${student.name} has submitted "${assessment.title}" for grading.`,
        isRead: false,
      });
    }
  };

  // ⬇️ MODIFIED: accept feedback, store it with the graded submission, and create a result
  const gradeAssessment = (submissionId: string, score: number, feedback?: string) => {
    const submission = assessmentSubmissions.find(s => s.submissionId === submissionId);
    if (!submission) return;

    setAssessmentSubmissions(prev =>
      prev.map(s =>
        s.submissionId === submissionId
          ? ({
              ...s,
              status: 'graded',
              score,
              ...(feedback ? { feedback } : {}),
            } as AssessmentSubmission & { feedback?: string })
          : s
      )
    );

    const student = mockUsers.find(u => u.userId === submission.studentId);
    const assessment = assessments.find(a => a.assessmentId === submission.assessmentId);
    if (!student || !assessment) return;

    addAssessmentResult(
      {
        assessmentId: submission.assessmentId,
        studentId: submission.studentId,
        score,
        timestamp: Date.now(),
      },
      student.name,
      assessment.title
    );
  };

  const addLessonSubmission = (
    submissionData: Omit<LessonSubmission, 'submissionId' | 'timestamp'>,
    studentName: string,
    assessmentTitle: string
  ) => {
    const submission = { ...submissionData, submissionId: `sub-${Date.now()}`, timestamp: Date.now() };
    setLessonSubmissions(prev => [...prev, submission]);

    const student = mockUsers.find(s => s.userId === submission.studentId);
    const assessment = assessments.find(a => a.assessmentId === submission.assessmentId);
    if (!student || !assessment) return;

    const teacher = mockUsers.find(u => u.role === Role.TEACHER && u.userId === assessment.teacherId);
    const parent = mockUsers.find(u => u.role === Role.PARENT && u.childIds?.includes(submission.studentId));

    if (teacher) {
      addNotification({
        userId: teacher.userId,
        message: `${studentName} submitted a task for ${assessmentTitle}.`,
        isRead: false,
      });
    }
    if (parent) {
      addNotification({
        userId: parent.userId,
        message: `Your child, ${studentName}, submitted a task for ${assessmentTitle}.`,
        isRead: false,
      });
    }
  };

  const addLessonPlan = (plan: LessonPlan) => {
    setLessonPlans(prev => {
      const existingPlanIndex = prev.findIndex(p => p.planId === plan.planId);
      if (existingPlanIndex > -1) {
        const newPlans = [...prev];
        newPlans[existingPlanIndex] = plan;
        return newPlans;
      }
      return [...prev, plan];
    });
  };

  const gradeSubmission = (submissionId: string, grade: 'approved' | 'needs_revision', feedback: string) => {
    setLessonSubmissions(prev =>
      prev.map(s => (s.submissionId === submissionId ? { ...s, status: 'graded', grade, feedback } : s))
    );
  };

  const readNotification = (notificationId: string) => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)));
  };

  const addCustomLesson = (lessonData: Omit<CustomLesson, 'lessonId'>) => {
    const newLesson = { ...lessonData, lessonId: `clesson-${Date.now()}` };
    setCustomLessons(prev => [...prev, newLesson]);
    newLesson.assignedStudentIds.forEach(studentId => {
      const student = mockUsers.find(u => u.userId === studentId);
      if (!student) return;
      const parent = mockUsers.find(p => p.role === Role.PARENT && p.childIds?.includes(studentId));
      if (parent) {
        addNotification({
          userId: parent.userId,
          message: `Your child, ${student.name}, has a new lesson: ${newLesson.title}`,
          isRead: false,
        });
      }
    });
  };

  const addCustomLessonSubmission = (
    submissionData: Omit<CustomLessonSubmission, 'submissionId' | 'status' | 'timestamp'>
  ) => {
    const newSubmission = {
      ...submissionData,
      submissionId: `clsub-${Date.now()}`,
      status: 'submitted' as const,
      timestamp: Date.now(),
    };
    setCustomLessonSubmissions(prev => [...prev, newSubmission]);

    const lesson = customLessons.find(l => l.lessonId === newSubmission.lessonId);
    const student = mockUsers.find(u => u.userId === newSubmission.studentId);
    if (!lesson || !student) return;

    const teacher = mockUsers.find(t => t.userId === lesson.teacherId);
    if (teacher) {
      addNotification({
        userId: teacher.userId,
        message: `${student.name} submitted the lesson "${lesson.title}".`,
        isRead: false,
      });
    }
  };

  const gradeCustomLessonSubmission = (submissionId: string, grade: number, feedback: string) => {
    setCustomLessonSubmissions(prev =>
      prev.map(s => (s.submissionId === submissionId ? { ...s, status: 'graded', grade, feedback } : s))
    );

    const submission = customLessonSubmissions.find(s => s.submissionId === submissionId);
    if (!submission) return;

    const lesson = customLessons.find(l => l.lessonId === submission.lessonId);
    const student = mockUsers.find(u => u.userId === submission.studentId);
    if (!lesson || !student) return;

    const parent = mockUsers.find(p => p.role === Role.PARENT && p.childIds?.includes(student.userId));
    if (parent) {
      addNotification({
        userId: parent.userId,
        message: `Your child, ${student.name}, was graded ${grade}% on the lesson "${lesson.title}".`,
        isRead: false,
      });
    }
  };

  // editing helpers
  const startEditingAssessment = (assessmentId: string) => setEditingAssessmentId(assessmentId);
  const clearEditingAssessment = () => setEditingAssessmentId(null);

  return (
    <DataContext.Provider
      value={{
        assessments,
        assessmentResults,
        assessmentSubmissions,
        lessonPlans,
        lessonSubmissions,
        notifications,
        customLessons,
        customLessonSubmissions,

        addAssessment,
        updateAssessment,
        getAssessmentById,

        addAssessmentResult,
        addAssessmentSubmission,
        gradeAssessment, // now accepts remarks

        addLessonSubmission,
        addLessonPlan,
        gradeSubmission,

        readNotification,

        addCustomLesson,
        addCustomLessonSubmission,
        gradeCustomLessonSubmission,

        editingAssessmentId,
        startEditingAssessment,
        clearEditingAssessment,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};


