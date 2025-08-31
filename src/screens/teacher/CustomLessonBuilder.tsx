import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { mockUsers } from '../../data/mockData';
import { Role, CustomLesson } from '../../types';
import Card from '../../components/ui/Card';
import { CheckCircle, BookPlus } from 'lucide-react';

const CustomLessonBuilder: React.FC = () => {
    const authContext = useContext(AuthContext);
    const dataContext = useContext(DataContext);
    const teacher = authContext?.user;

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
    const [isSaved, setIsSaved] = useState(false);

    if (!teacher || !dataContext) return null;

    const classStudents = mockUsers.filter(u => u.role === Role.STUDENT && u.classId === teacher.classId);

    const handleStudentSelect = (studentId: string) => {
        setAssignedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };
    
    const handleSelectAll = () => {
        if(assignedStudentIds.length === classStudents.length){
            setAssignedStudentIds([]);
        } else {
            setAssignedStudentIds(classStudents.map(s => s.userId));
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher.userId || assignedStudentIds.length === 0) {
            alert("Please fill all fields and select at least one student.");
            return;
        }

        const newLesson: Omit<CustomLesson, 'lessonId'> = {
            teacherId: teacher.userId,
            title,
            subject,
            description,
            assignedStudentIds,
        };

        dataContext.addCustomLesson(newLesson);
        setIsSaved(true);
        setTitle('');
        setSubject('');
        setDescription('');
        setAssignedStudentIds([]);
        setTimeout(() => setIsSaved(false), 3000);
    };


    return (
        <Card>
            <h3 className="text-xl font-bold text-royal-blue mb-4">Create & Assign a New Lesson</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lesson Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-royal-blue focus:ring-royal-blue" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Subject</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-royal-blue focus:ring-royal-blue" required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Instructions / Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-royal-blue focus:ring-royal-blue" required />
                </div>

                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Assign to Students</h4>
                    <div className="flex items-center mb-2">
                        <input type="checkbox" id="select-all" onChange={handleSelectAll} checked={assignedStudentIds.length === classStudents.length} className="h-4 w-4 rounded text-royal-blue focus:ring-royal-blue"/>
                        <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-700">Select All</label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        {classStudents.map(student => (
                            <div key={student.userId} className="flex items-center">
                                <input
                                    id={`student-${student.userId}`}
                                    type="checkbox"
                                    checked={assignedStudentIds.includes(student.userId)}
                                    onChange={() => handleStudentSelect(student.userId)}
                                    className="h-4 w-4 rounded text-royal-blue focus:ring-royal-blue"
                                />
                                <label htmlFor={`student-${student.userId}`} className="ml-2 text-sm text-gray-700">{student.name}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="flex items-center justify-center rounded-md bg-royal-blue px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2">
                        {isSaved ? (
                            <>
                                <CheckCircle className="mr-2 h-5 w-5" />
                                Assigned!
                            </>
                        ) : (
                            <>
                                <BookPlus className="mr-2 h-5 w-5" />
                                Assign Lesson
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Card>
    )
}

export default CustomLessonBuilder;
