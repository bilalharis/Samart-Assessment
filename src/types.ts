export enum Role {
  TEACHER = 'teacher',
  PRINCIPAL = 'principal',
  PARENT = 'parent',
  STUDENT = 'student',
}

export interface User {
  userId: string;
  name: string;
  email: string;
  role: Role;
  classId?: string;
  schoolId: string;
  childIds?: string[];
  hasIEP?: boolean;
  gender?: 'male' | 'female';
  subject?: string;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multipleChoice',
  SHORT_ANSWER = 'shortAnswer',
}

export interface Question {
  questionText: string;
  type: QuestionType;
  options?: string[]; // For multiple choice
  correctOptionIndex?: number; // For multiple choice
}

export interface Assessment {
  assessmentId: string;
  title: string;
  subject: string;
  grade: string;
  teacherId: string;
  classId: string;
  questions: Question[];
}

export interface AssessmentResult {
  resultId: string;
  assessmentId: string;
  studentId: string;
  score: number; // Percentage
  timestamp: number; // Unix timestamp for historical tracking
}

export interface AssessmentSubmission {
    submissionId: string;
    assessmentId: string;
    studentId: string;
    answers: { [key: number]: any }; // key is question index
    status: 'pending' | 'graded';
    score?: number; // assigned upon grading
}

export interface LessonPlan {
  planId: string;
  teacherId: string;
  assessmentId: string;
  masteryTasks: { students: string[], tasks: string };
  developingTasks: { students: string[], tasks: string };
  needsSupportTasks: { students: string[], tasks: string };
  iepConsidered: boolean;
}

export enum PerformanceTier {
    MASTERED = 'Mastered',
    DEVELOPING = 'Developing',
    NEEDS_SUPPORT = 'Needs Support',
}

export interface LessonSubmission {
    submissionId: string;
    assessmentId: string;
    studentId: string;
    submissionContent?: string;
    fileName?: string;
    status: 'submitted' | 'graded';
    grade?: 'approved' | 'needs_revision';
    feedback?: string;
    timestamp: number;
}

export interface CustomLesson {
    lessonId: string;
    teacherId: string;
    title: string;
    subject: string;
    description: string;
    assignedStudentIds: string[];
}

export interface CustomLessonSubmission {
    submissionId: string;
    lessonId: string;
    studentId: string;
    submissionContent: string;
    fileName?: string;
    status: 'submitted' | 'graded';
    grade?: number; // Numerical score out of 100
    feedback?: string;
    timestamp: number;
}


export interface Notification {
    id: string;
    userId: string; // Recipient's ID (teacher or parent)
    message: string;
    isRead: boolean;
}