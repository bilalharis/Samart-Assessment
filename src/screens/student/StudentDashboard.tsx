import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { User, Role, PerformanceTier, Assessment, QuestionType, CustomLesson, LessonSubmission } from '../../types';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { TIER_THRESHOLDS, TIER_COLORS } from '../../constants';
import { ClipboardCheck, Target, Award, CheckCircle, Clock, User as UserIcon, Send, Hourglass, Upload } from 'lucide-react';

const getPerformanceTier = (score: number): PerformanceTier => {
  if (score >= TIER_THRESHOLDS[PerformanceTier.MASTERED]) return PerformanceTier.MASTERED;
  if (score >= TIER_THRESHOLDS[PerformanceTier.DEVELOPING]) return PerformanceTier.DEVELOPING;
  return PerformanceTier.NEEDS_SUPPORT;
};

/* ------- Modals (unchanged) ------- */
const TakeAssessmentModal = ({ isOpen, onClose, assessment, student, onSubmit }: { isOpen: boolean, onClose: () => void, assessment: Assessment | null, student: User, onSubmit: (answers: { [key: number]: any }) => void }) => {
  const [answers, setAnswers] = useState<{ [key: number]: any }>({});
  if (!isOpen || !assessment) return null;
  const handleAnswerChange = (qIndex: number, value: any) => setAnswers(prev => ({ ...prev, [qIndex]: value }));
  const handleSubmit = () => onSubmit(answers);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assessment: ${assessment.title}`}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {assessment.questions.map((q, qIndex) => (
          <div key={qIndex} className="p-3 border-b">
            <p className="font-semibold">{qIndex + 1}. {q.questionText}</p>
            {q.type === QuestionType.MULTIPLE_CHOICE ? (
              <div className="mt-2 space-y-1">
                {q.options?.map((opt, oIndex) => (
                  <label key={oIndex} className="flex items-center space-x-2">
                    <input type="radio" name={`q-${qIndex}`} value={oIndex} onChange={() => handleAnswerChange(qIndex, oIndex)} className="h-4 w-4" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea onChange={(e) => handleAnswerChange(qIndex, e.target.value)} rows={2} className="mt-2 w-full p-2 border border-gray-300 rounded-md" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={handleSubmit} className="flex items-center rounded-md bg-royal-blue px-4 py-2 text-sm font-medium text-white">
          <Send size={16} className="mr-2" /> Submit for Grading
        </button>
      </div>
    </Modal>
  );
};

const TakeLessonModal = ({ isOpen, onClose, lesson, onSubmit }: { isOpen: boolean, onClose: () => void, lesson: CustomLesson | null, onSubmit: (submissionContent: string, fileName?: string) => void }) => {
  const [submissionContent, setSubmissionContent] = useState('');
  const [fileName, setFileName] = useState('');
  if (!isOpen || !lesson) return null;
  const handleSubmit = () => onSubmit(submissionContent, fileName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lesson: ${lesson.title}`}>
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-gray-800">Instructions</h4>
          <p className="mt-1 p-2 bg-gray-100 rounded text-gray-700 whitespace-pre-wrap">{lesson.description}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Your Response</label>
          <textarea value={submissionContent} onChange={(e) => setSubmissionContent(e.target.value)} rows={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload File (Optional)</label>
          <div className="mt-1 flex items-center space-x-2">
            <label className="w-full flex items-center px-4 py-2 bg-white text-royal-blue rounded-lg shadow-sm tracking-wide border border-royal-blue cursor-pointer hover:bg-blue-50">
              <Upload size={18} className="mr-2"/>
              <span className="truncate">{fileName || 'Choose a file...'}</span>
              <input type='file' className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
            </label>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={handleSubmit} className="flex items-center rounded-md bg-royal-blue px-4 py-2 text-sm font-medium text-white">
          <Send size={16} className="mr-2" /> Submit Lesson
        </button>
      </div>
    </Modal>
  );
};

type TaskInfo = {
  assessmentId: string;
  assessmentTitle: string;
  taskDescription: string;
};

const SubmitTaskModal = ({ isOpen, onClose, taskInfo, onSubmit }: { isOpen: boolean, onClose: () => void, taskInfo: TaskInfo | null, onSubmit: (submissionContent: string, fileName?: string) => void }) => {
  const [submissionContent, setSubmissionContent] = useState('');
  const [fileName, setFileName] = useState('');
  if (!isOpen || !taskInfo) return null;
  const handleSubmit = () => onSubmit(submissionContent, fileName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Task for: ${taskInfo.assessmentTitle}`}>
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-gray-800">Instructions</h4>
          <p className="mt-1 p-2 bg-gray-100 rounded text-gray-700 whitespace-pre-wrap">{taskInfo.taskDescription}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Your Response</label>
          <textarea value={submissionContent} onChange={(e) => setSubmissionContent(e.target.value)} rows={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload File (Optional)</label>
          <div className="mt-1 flex items-center space-x-2">
            <label className="w-full flex items-center px-4 py-2 bg-white text-royal-blue rounded-lg shadow-sm tracking-wide border border-royal-blue cursor-pointer hover:bg-blue-50">
              <Upload size={18} className="mr-2"/>
              <span className="truncate">{fileName || 'Choose a file...'}</span>
              <input type='file' className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
            </label>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={handleSubmit} className="flex items-center rounded-md bg-gold-accent text-royal-blue font-bold px-4 py-2 text-sm shadow-sm hover:bg-opacity-90">
          <Send size={16} className="mr-2" /> Submit Task
        </button>
      </div>
    </Modal>
  );
};

const ViewSubmissionModal = ({ isOpen, onClose, submission, assessmentTitle }: { isOpen: boolean; onClose: () => void; submission: LessonSubmission | null; assessmentTitle: string | undefined }) => {
  if (!isOpen || !submission || !assessmentTitle) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`My Submission for: ${assessmentTitle}`}>
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-gray-800">My Response</h4>
          <p className="mt-1 p-2 bg-gray-100 rounded text-gray-700 whitespace-pre-wrap">{submission.submissionContent || 'No text content submitted.'}</p>
          {submission.fileName && <p className="text-sm text-gray-600 mt-1">Uploaded file: <span className="font-medium">{submission.fileName}</span></p>}
        </div>
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-bold text-gray-800">Status</h4>
          {submission.status === 'graded' ? (
            <div>
              <p className={`mt-1 font-semibold capitalize ${submission.grade === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>Graded: {submission.grade}</p>
              {submission.feedback ? (
                <>
                  <h5 className="font-semibold text-gray-700 mt-2">Teacher's Feedback:</h5>
                  <p className="mt-1 p-2 bg-blue-50 rounded text-gray-700">{submission.feedback}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No feedback provided.</p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Your task is submitted and is waiting for the teacher to review it.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
/* ------- End modals ------- */

const StudentDashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const dataContext = useContext(DataContext);
  const student = authContext?.user as User;

  const [takingAssessment, setTakingAssessment] = useState<Assessment | null>(null);
  const [takingLesson, setTakingLesson] = useState<CustomLesson | null>(null);
  const [submittingTask, setSubmittingTask] = useState<{ assessmentId: string; assessmentTitle: string; taskDescription: string } | null>(null);
  const [viewingSubmissionDetails, setViewingSubmissionDetails] = useState<{ submission: LessonSubmission, title: string } | null>(null);

  const studentData = useMemo(() => {
    if (!student || !dataContext) return null;
    const { assessments, assessmentResults, lessonPlans, lessonSubmissions, assessmentSubmissions, customLessons, customLessonSubmissions } = dataContext;

    const results = assessmentResults
      .filter(r => r.studentId === student.userId)
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
        const submission = lessonSubmissions.find(s => s.assessmentId === result.assessmentId && s.studentId === student.userId);

        return {
          ...result,
          title: assessment?.title || 'Unknown Assessment',
          subject: assessment?.subject || 'N/A',
          tier,
          assignedTasks,
          submission,
        };
      })
      .sort((a,b) => b.timestamp - a.timestamp);

    const submittedAssessmentIds = assessmentSubmissions
      .filter(s => s.studentId === student.userId)
      .map(s => s.assessmentId);

    const resultIds = results.map(r => r.assessmentId);

    const pendingAssessments = assessments
      .filter(a => a.classId === student.classId && !submittedAssessmentIds.includes(a.assessmentId) && !resultIds.includes(a.assessmentId));

    // ✅ Only Math/Science lessons in To-Do & history
    const allowedSubjects = new Set(['Science','Mathematics','Math','Maths']);

    const submittedCustomLessonIds = customLessonSubmissions
      .filter(s => s.studentId === student.userId)
      .map(s => s.lessonId);

    const pendingLessons = customLessons
      .filter(l => allowedSubjects.has(l.subject) && l.assignedStudentIds.includes(student.userId) && !submittedCustomLessonIds.includes(l.lessonId));

    const submittedLessons = customLessonSubmissions
      .filter(s => s.studentId === student.userId)
      .map(s => {
        const lesson = customLessons.find(l => l.lessonId === s.lessonId);
        if (!lesson || !allowedSubjects.has(lesson.subject)) return null;
        return { ...s, title: lesson.title };
      })
      .filter(Boolean)
      .sort((a:any,b:any) => b.timestamp - a.timestamp);

    const pendingGradingAssessments = assessmentSubmissions
      .filter(s => s.studentId === student.userId && s.status === 'pending')
      .map(s => assessments.find(a => a.assessmentId === s.assessmentId))
      .filter((a): a is Assessment => !!a);

    return { results, pendingAssessments, pendingGrading: pendingGradingAssessments, pendingLessons, submittedLessons };
  }, [student, dataContext]);

  if (!student || student.role !== Role.STUDENT) return <div className="p-8">Access Denied</div>;
  if (!studentData) return <div className="p-8">Loading data...</div>;

  const { results, pendingAssessments, pendingGrading, pendingLessons, submittedLessons } = studentData;

  const handleAssessmentSubmit = (answers: { [key: number]: any }) => {
    if (!dataContext?.addAssessmentSubmission || !student || !takingAssessment) return;
    dataContext.addAssessmentSubmission({
      assessmentId: takingAssessment.assessmentId,
      studentId: student.userId,
      answers,
    });
    setTakingAssessment(null);
  };

  const handleLessonSubmit = (submissionContent: string, fileName?: string) => {
    if (!dataContext?.addCustomLessonSubmission || !student || !takingLesson) return;
    dataContext.addCustomLessonSubmission({
      lessonId: takingLesson.lessonId,
      studentId: student.userId,
      submissionContent,
      fileName,
    });
    setTakingLesson(null);
  };

  const handleTaskSubmit = (submissionContent: string, fileName?: string) => {
    if (!dataContext?.addLessonSubmission || !student || !submittingTask) return;
    const submissionData: Omit<LessonSubmission, 'submissionId' | 'timestamp'> = {
      assessmentId: submittingTask.assessmentId,
      studentId: student.userId,
      status: 'submitted',
      submissionContent,
      fileName,
    };
    dataContext.addLessonSubmission(submissionData, student.name, submittingTask.assessmentTitle);
    setSubmittingTask(null);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full border-4 border-royal-blue bg-gray-200 flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-gray-500"/>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-royal-blue">Student Dashboard</h2>
            <p className="text-gray-600">Welcome, {student.name}!</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">My To-Do List</h3>
            <div className="space-y-4">
              {/* Only Math/Science lessons */}
              {pendingLessons.map(lesson => (
                <div key={lesson.lessonId} className="p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{lesson.title}</p>
                    <p className="text-sm text-gray-500">{lesson.subject}</p>
                  </div>
                  <button onClick={() => setTakingLesson(lesson)} className="rounded-md bg-gold-accent text-royal-blue font-bold px-4 py-2 text-sm shadow-sm hover:bg-opacity-90">
                    Start Lesson
                  </button>
                </div>
              ))}

              {pendingAssessments.map(ass => (
                <div key={ass.assessmentId} className="p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{ass.title}</p>
                    <p className="text-sm text-gray-500">{ass.subject}</p>
                  </div>
                  <button onClick={() => setTakingAssessment(ass)} className="rounded-md bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-opacity-90">
                    Take Now
                  </button>
                </div>
              ))}

              {pendingAssessments.length === 0 && pendingLessons.length === 0 && <p className="text-gray-500">No new assignments. Great job!</p>}
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4 flex items-center"><Hourglass className="mr-2"/>Submitted Work</h3>
            <div className="space-y-4">
              {submittedLessons.map((sub: any) => (
                <div key={sub.submissionId} className="p-3 rounded-lg border flex justify-between items-center bg-gray-50">
                  <p className="font-semibold text-gray-700">{sub.title}</p>
                  <span className="text-sm font-semibold text-gray-600">{sub.status === 'submitted' ? 'Pending Grade...' : `Graded: ${sub.grade}%`}</span>
                </div>
              ))}
              {pendingGrading.map(ass => (
                <div key={ass.assessmentId} className="p-3 rounded-lg border flex justify-between items-center bg-gray-50">
                  <p className="font-semibold text-gray-700">{ass.title}</p>
                  <span className="text-sm font-semibold text-gray-600">Pending Grade...</span>
                </div>
              ))}
              {pendingGrading.length === 0 && submittedLessons.length === 0 && <p className="text-gray-500">No work is waiting for a grade.</p>}
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-xl font-bold text-royal-blue mb-4 flex items-center"><ClipboardCheck className="mr-2"/>My Results & Tasks</h3>
          <div className="space-y-4">
            {results.map(result => (
              <div key={result.resultId} className="p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{result.title}</p>
                    <p className="text-sm text-gray-500">{result.subject}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-1 ${TIER_COLORS[result.tier]}`}>
                    <Award size={16} />
                    <span>{result.score}%</span>
                  </div>
                </div>
                {result.assignedTasks && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="cursor-pointer" onClick={() => {
                      if (result.submission) {
                        setViewingSubmissionDetails({ submission: result.submission, title: result.title });
                      } else {
                        setSubmittingTask({ assessmentId: result.assessmentId, assessmentTitle: result.title, taskDescription: result.assignedTasks });
                      }
                    }}>
                      <h4 className="font-semibold text-gray-700 flex items-center"><Target className="mr-2" size={16}/>Your Task:</h4>
                      <p className="text-sm text-gray-600 pl-6">{result.assignedTasks}</p>
                    </div>
                    <div className="mt-2 text-right">
                      {result.submission ? (
                        <>
                          {result.submission.status === 'graded' ? (
                            <span className={`text-xs font-semibold flex items-center justify-end ${result.submission.grade === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                              <CheckCircle size={14} className="mr-1"/> Graded: {result.submission.grade}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold flex items-center justify-end text-blue-600">
                              <Clock size={14} className="mr-1"/> Submitted for review
                            </span>
                          )}
                          <div className="text-xs text-blue-600 font-semibold">(Click task to view submission)</div>
                        </>
                      ) : (
                        <div className="text-xs text-blue-600 font-semibold">(Click task to open editor)</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {results.length === 0 && <p className="text-gray-500">You have not completed any assessments yet.</p>}
          </div>
        </Card>
      </div>

      <TakeAssessmentModal isOpen={!!takingAssessment} onClose={() => setTakingAssessment(null)} assessment={takingAssessment} student={student} onSubmit={handleAssessmentSubmit} />
      <TakeLessonModal isOpen={!!takingLesson} onClose={() => setTakingLesson(null)} lesson={takingLesson} onSubmit={handleLessonSubmit} />
      <SubmitTaskModal isOpen={!!submittingTask} onClose={() => setSubmittingTask(null)} taskInfo={submittingTask} onSubmit={handleTaskSubmit} />
      <ViewSubmissionModal isOpen={!!viewingSubmissionDetails} onClose={() => setViewingSubmissionDetails(null)} submission={viewingSubmissionDetails?.submission || null} assessmentTitle={viewingSubmissionDetails?.title} />
    </div>
  );
};

export default StudentDashboard;

