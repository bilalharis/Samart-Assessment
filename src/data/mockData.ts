import {
  User,
  Role,
  Assessment,
  QuestionType,
  AssessmentResult,
  LessonPlan,
  LessonSubmission,
  Notification,
  AssessmentSubmission,
  CustomLesson,
  CustomLessonSubmission
} from '../types';

export const mockUsers: User[] = [
  { userId: 'principal-1', name: 'Mr. Ahmed Al-Fahim', email: 'principal.ahmed@school.ae', role: Role.PRINCIPAL, schoolId: 'uae-school-1' },

  // Teachers
  { userId: 'teacher-1', name: 'Ms. Fatima',  email: 'ms.fatima@school.ae',  role: Role.TEACHER, schoolId: 'uae-school-1', classId: 'class-1', subject: 'Science' },
  { userId: 'teacher-3', name: 'Mr. Khalid',  email: 'mr.khalid@school.ae',  role: Role.TEACHER, schoolId: 'uae-school-1', classId: 'class-1', subject: 'Math' }, // <- was "Maths"

  // Parents
  { userId: 'parent-1', name: 'Mr. Abdullah',   email: 'abdullah@email.com',  role: Role.PARENT,  schoolId: 'uae-school-1', childIds: ['student-1'] },
  { userId: 'parent-2', name: 'Mrs. Al Hamad',  email: 'alhamad@email.com',   role: Role.PARENT,  schoolId: 'uae-school-1', childIds: ['student-2'] },
  { userId: 'parent-3', name: 'Mr. Al Qasimi',  email: 'alqasimi@email.com',  role: Role.PARENT,  schoolId: 'uae-school-1', childIds: ['student-3'] },
  { userId: 'parent-4', name: 'Mrs. Al Nuaimi', email: 'alnuaimi@email.com',  role: Role.PARENT,  schoolId: 'uae-school-1', childIds: ['student-4'] },
  { userId: 'parent-5', name: 'Mr. Al Falahi',  email: 'alfalahi@email.com',  role: Role.PARENT,  schoolId: 'uae-school-1', childIds: ['student-5'] },

  // Students
  { userId: 'student-1', name: 'Zayed Al Maktoum',  email: 'zayed@email.com',  role: Role.STUDENT, schoolId: 'uae-school-1', classId: 'class-1', hasIEP: true,  gender: 'male' },
  { userId: 'student-2', name: 'Noora Al Hamad',    email: 'noora@email.com',  role: Role.STUDENT, schoolId: 'uae-school-1', classId: 'class-1',               gender: 'female' },
  { userId: 'student-3', name: 'Sultan Al Qasimi',  email: 'sultan@email.com', role: Role.STUDENT, schoolId: 'uae-school-1', classId: 'class-1',               gender: 'male' },
  { userId: 'student-4', name: 'Aisha Al Nuaimi',   email: 'aisha@email.com',  role: Role.STUDENT, schoolId: 'uae-school-1', classId: 'class-1',               gender: 'female' },
  { userId: 'student-5', name: 'Rashid Al Falahi',  email: 'rashid@email.com', role: Role.STUDENT, schoolId: 'uae-school-1', classId: 'class-1',               gender: 'male' },
];

export const mockAssessments: Assessment[] = [
  {
    assessmentId: 'assessment-1',
    title: 'Chapter 1',
    subject: 'Science',
    grade: '5',
    teacherId: 'teacher-1',
    classId: 'class-1',
    questions: [
      { questionText: 'What is photosynthesis?', type: QuestionType.SHORT_ANSWER },
      { questionText: 'Which planet is known as the Red Planet?', type: QuestionType.MULTIPLE_CHOICE, options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correctOptionIndex: 1 }
    ]
  },
  {
    assessmentId: 'assessment-2',
    title: 'Chapter 1',
    subject: 'Math', // <- was "Mathematics"
    grade: '5',
    teacherId: 'teacher-3',
    classId: 'class-1',
    questions: [
      { questionText: 'What is 1/2 + 1/4? The answer should be in the format "x/y".', type: QuestionType.SHORT_ANSWER },
      { questionText: 'Simplify the fraction 6/8.', type: QuestionType.MULTIPLE_CHOICE, options: ['1/2', '3/4', '2/3', '1/4'], correctOptionIndex: 1 },
    ]
  }
];

export const mockAssessmentResults: AssessmentResult[] = [
  // Science (assessment-1)
  { resultId: 'result-1-1', assessmentId: 'assessment-1', studentId: 'student-1', score: 92, timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-1-2', assessmentId: 'assessment-1', studentId: 'student-2', score: 78, timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-1-3', assessmentId: 'assessment-1', studentId: 'student-3', score: 65, timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-1-4', assessmentId: 'assessment-1', studentId: 'student-4', score: 45, timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-1-5', assessmentId: 'assessment-1', studentId: 'student-5', score: 88, timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 },

  // Math (assessment-2)
  { resultId: 'result-2-1', assessmentId: 'assessment-2', studentId: 'student-1', score: 81, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-2-2', assessmentId: 'assessment-2', studentId: 'student-2', score: 74, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-2-3', assessmentId: 'assessment-2', studentId: 'student-3', score: 68, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-2-4', assessmentId: 'assessment-2', studentId: 'student-4', score: 59, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 },
  { resultId: 'result-2-5', assessmentId: 'assessment-2', studentId: 'student-5', score: 87, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 },
];

export const mockAssessmentSubmissions: AssessmentSubmission[] = [
  { submissionId: 'assess-sub-1', assessmentId: 'assessment-1', studentId: 'student-1', answers: {0: 'The process plants use to convert light into food.', 1: 1}, status: 'graded', score: 92 },
  { submissionId: 'assess-sub-2', assessmentId: 'assessment-2', studentId: 'student-2', answers: {0: '3/4', 1: 1}, status: 'pending' },
];

export const mockLessonPlans: LessonPlan[] = [];

export const mockLessonSubmissions: LessonSubmission[] = [];

// ⛔️ No English custom lessons
export const mockCustomLessons: CustomLesson[] = [];
export const mockCustomLessonSubmissions: CustomLessonSubmission[] = [];

export const mockNotifications: Notification[] = [
  // { id: 'notif-1', userId: 'parent-1',  message: 'Zayed Al Maktoum has a new assessment: Grade 5 - Math - Fractions.', isRead: true },
  // { id: 'notif-2', userId: 'parent-1',  message: 'Zayed Al Maktoum scored 92% Chapter 1.',     isRead: false },
  // { id: 'notif-3', userId: 'teacher-1', message: 'Aisha Al Nuaimi submitted their task for Grade 5 - Science - Chapter 3.', isRead: false },
  // { id: 'notif-4', userId: 'teacher-3', message: 'Noora Al Hamad has submitted the assessment "Grade 5 - Math - Fractions" for grading.', isRead: false },
];
