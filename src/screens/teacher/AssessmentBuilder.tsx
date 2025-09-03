import React, { useEffect, useMemo, useState } from 'react';
import { Assessment, QuestionType } from '../../types';

type BuilderProps = {
  /** When present, edits this assessment; otherwise creates a new one */
  editingAssessment?: Assessment;
  /** Default subject to prefill new assessments (e.g., teacher’s subject) */
  defaultSubject?: string;
  /** Default grade to prefill new assessments */
  defaultGrade?: string;
  /** Force class to assign (teacher’s class). Parent normalizes teacherId/classId/subject on save */
  forceClassId?: string;
  /** Called when user saves successfully */
  onSaved: (assessment: Assessment) => void;
};

type MCQ = {
  questionText: string;
  type: QuestionType.MULTIPLE_CHOICE;
  options: string[];
  correctOptionIndex: number | null;
};

type SA = {
  questionText: string;
  type: QuestionType.SHORT_ANSWER;
};

type LocalQuestion = MCQ | SA;

const emptyMCQ = (): MCQ => ({
  questionText: '',
  type: QuestionType.MULTIPLE_CHOICE,
  options: ['', ''],
  correctOptionIndex: null,
});

const emptySA = (): SA => ({
  questionText: '',
  type: QuestionType.SHORT_ANSWER,
});

// Dropdown options for Title
const CHAPTER_OPTIONS = Array.from({ length: 10 }, (_, i) => `Chapter ${i + 1}`);

const AssessmentBuilder: React.FC<BuilderProps> = ({
  editingAssessment,
  defaultSubject = 'Science',
  defaultGrade = '5',
  forceClassId,
  onSaved,
}) => {
  // -------------------- form state --------------------
  const [title, setTitle] = useState(''); // now driven by dropdown
  const [subject, setSubject] = useState(defaultSubject);
  const [grade, setGrade] = useState(defaultGrade);
  const [questions, setQuestions] = useState<LocalQuestion[]>([emptyMCQ()]);
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingAssessment;

  // Preload when editing, reset when switching between edit/new
  useEffect(() => {
    if (editingAssessment) {
      setTitle(editingAssessment.title || '');
      setSubject(editingAssessment.subject || defaultSubject);
      setGrade(editingAssessment.grade || defaultGrade);

      const qs: LocalQuestion[] = editingAssessment.questions.map((q) => {
        if (q.type === QuestionType.MULTIPLE_CHOICE) {
          return {
            questionText: q.questionText,
            type: QuestionType.MULTIPLE_CHOICE,
            options: [...(q.options || [])],
            correctOptionIndex:
              typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : null,
          };
        }
        return { questionText: q.questionText, type: QuestionType.SHORT_ANSWER };
      });
      setQuestions(qs.length ? qs : [emptyMCQ()]);
    } else {
      // brand new
      setTitle('');
      setSubject(defaultSubject);
      setGrade(defaultGrade);
      setQuestions([emptyMCQ()]);
    }
    setSaving(false);
  }, [editingAssessment, defaultSubject, defaultGrade]);

  // -------------------- helpers --------------------
  const validate = () => {
    if (!title.trim()) return 'Please enter a title.';
    if (!subject.trim()) return 'Please select a subject.';
    if (!grade.trim()) return 'Please select a grade.';
    if (!questions.length) return 'Please add at least one question.';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return `Question ${i + 1}: please enter the question text.`;
      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        if (q.options.some((o) => !o.trim()))
          return `Question ${i + 1}: please fill all options.`;
        if (q.options.length < 2)
          return `Question ${i + 1}: add at least two options.`;
        if (
          q.correctOptionIndex == null ||
          q.correctOptionIndex < 0 ||
          q.correctOptionIndex >= q.options.length
        )
          return `Question ${i + 1}: select the correct option.`;
      }
    }
    return null;
  };

  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [...prev, type === QuestionType.SHORT_ANSWER ? emptySA() : emptyMCQ()]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, questionText: text } : q))
    );
  };

  const switchType = (index: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        return type === QuestionType.SHORT_ANSWER ? emptySA() : emptyMCQ();
      })
    );
  };

  const addMCQOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type !== QuestionType.MULTIPLE_CHOICE) return q;
        return { ...q, options: [...q.options, ''] };
      })
    );
  };

  const updateMCQOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type !== QuestionType.MULTIPLE_CHOICE) return q;
        const options = q.options.map((o, oi) => (oi === optIndex ? value : o));
        return { ...q, options };
      })
    );
  };

  const setCorrectIndex = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type !== QuestionType.MULTIPLE_CHOICE) return q;
        return { ...q, correctOptionIndex: optIndex };
      })
    );
  };

  // -------------------- submit --------------------
  const onSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    setSaving(true);

    // Convert local questions to Assessment questions
    const normalizedQuestions = questions.map((q) => {
      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        return {
          questionText: q.questionText.trim(),
          type: QuestionType.MULTIPLE_CHOICE as const,
          options: q.options.map((o) => o.trim()),
          correctOptionIndex: q.correctOptionIndex ?? 0,
        };
      }
      return {
        questionText: q.questionText.trim(),
        type: QuestionType.SHORT_ANSWER as const,
      };
    });

    const payload: Assessment = {
      assessmentId: editingAssessment?.assessmentId || `assessment-${Date.now()}`,
      title: title.trim(), // selected chapter string
      subject: subject.trim(),
      grade: grade.trim(),
      // TeacherDashboard will normalize these on save
      teacherId: editingAssessment?.teacherId || '',
      classId: editingAssessment?.classId || forceClassId || '',
      questions: normalizedQuestions,
    };

    onSaved(payload);
    setSaving(false);
  };

  // -------------------- UI --------------------
  const isValidNow = useMemo(() => !validate(), [title, subject, grade, questions]);

  // If editing shows a non-standard title, include it in the dropdown so it stays selectable
  const titleOptions =
    CHAPTER_OPTIONS.includes(title) || title === '' ? CHAPTER_OPTIONS : [title, ...CHAPTER_OPTIONS];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-royal-blue">
          {isEditing ? 'Edit Assessment' : 'Create Assessment'}
        </h3>
      </div>

      {/* First row: left-aligned, 70% width, equal columns */}
      <div className="w-[70%]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Grade (locked) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <input
              type="text"
              value={grade}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 cursor-not-allowed"
            />
          </div>

          {/* Subject (locked) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 cursor-not-allowed"
            />
          </div>

          {/* Title (dropdown chapters) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md px-3 py-2 border border-gray-300 focus:ring-royal-blue focus:border-royal-blue text-gray-800"
            >
              <option value="" disabled>
                Click to select chapter
              </option>
              {titleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">Question {index + 1}</h4>
              <button
                onClick={() => removeQuestion(index)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question text
                </label>
                <textarea
                  value={q.questionText}
                  onChange={(e) => updateQuestionText(index, e.target.value)}
                  rows={2}
                  className="w-full rounded-md px-3 py-2 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={q.type}
                  onChange={(e) => switchType(index, e.target.value as QuestionType)}
                  className="w-full rounded-md px-3 py-2 border border-gray-300"
                >
                  <option value={QuestionType.MULTIPLE_CHOICE}>Multiple choice</option>
                  <option value={QuestionType.SHORT_ANSWER}>Short answer</option>
                </select>
              </div>
            </div>

            {q.type === QuestionType.MULTIPLE_CHOICE && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`q-${index}-correct`}
                        checked={q.correctOptionIndex === oi}
                        onChange={() => setCorrectIndex(index, oi)}
                        className="h-4 w-4"
                        aria-label="Correct"
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateMCQOption(index, oi, e.target.value)}
                        className="flex-1 rounded-md px-3 py-2 border border-gray-300"
                        placeholder={`Option ${oi + 1}`}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => addMCQOption(index)}
                    className="text-sm text-royal-blue font-semibold hover:underline"
                  >
                    + Add option
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Single add-button (default adds MCQ, type can be changed via dropdown) */}
        <div className="mt-2">
          <button
            onClick={() => addQuestion(QuestionType.MULTIPLE_CHOICE)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Add question
          </button>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <button
          onClick={onSubmit}
          disabled={saving || !isValidNow}
          className={`rounded-md px-5 py-2 text-sm font-medium text-white ${
            saving || !isValidNow ? 'bg-royal-blue/60 cursor-not-allowed' : 'bg-royal-blue'
          }`}
        >
          {isEditing ? 'Save Changes' : 'Create Assessment'}
        </button>
      </div>
    </div>
  );
};

export default AssessmentBuilder;
