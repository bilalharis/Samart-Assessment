import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/ui/Card';
import { Award, BarChart2, BookOpen, CheckSquare, ChevronLeft, ChevronRight, Edit, Home, Mail, Pause, Play, Users, X } from 'lucide-react';

interface PromoVideoProps {
  onExit: () => void;
}

const scenes = [
    {
        title: "Empowering Educators",
        text: "It starts with our teachers. Ms. Fatima easily creates a new science assessment, tailored to her Grade 5 curriculum.",
        benefit: "Saves time & ensures curriculum alignment.",
        Icon: Edit,
    },
    {
        title: "Engaging Learners",
        text: "Students like Zayed receive the assessment instantly. They can complete their work in an engaging, digital format.",
        benefit: "Modern learning experience, immediate submission.",
        Icon: BookOpen,
    },
    {
        title: "Data-Driven Insights",
        text: "The moment work is graded, our system provides instant analysis. Ms. Fatima sees a clear performance matrix, identifying which students have mastered the content and who needs support.",
        benefit: "Real-time, actionable data. No more manual grading piles.",
        Icon: BarChart2,
    },
    {
        title: "Differentiated Instruction",
        text: "With this data, Ms. Fatima creates a differentiated lesson plan. Mastery students get enrichment tasks, while others receive targeted support—all within minutes.",
        benefit: "Caters to individual student needs, closing learning gaps faster.",
        Icon: CheckSquare,
    },
    {
        title: "Closing the Loop",
        text: "Students receive their results and a personalized follow-up task. Parents are kept informed of their child's progress, strengthening the home-school connection.",
        benefit: "Transparent communication & student accountability.",
        Icon: Mail,
    },
    {
        title: "School-Wide Oversight",
        text: "And for you, Mr. Al-Fahim, all this data rolls up into a powerful executive dashboard. Track performance by grade, subject, or class to support your teachers effectively.",
        benefit: "Strategic oversight, data for KHDA reporting, informed decisions.",
        Icon: Award,
    },
     {
        title: "A New Way of Learning",
        text: "The Smart Assessment Feedback Loop isn't just a tool; it's a new way of teaching and learning. It empowers teachers, engages students, and provides you with the insights to lead your school to excellence.",
        benefit: "Driving school-wide improvement.",
        Icon: Home,
    },
];

const PromoVideo: React.FC<PromoVideoProps> = ({ onExit }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        if (isPlaying && currentSceneIndex < scenes.length - 1) {
            const timer = setInterval(() => {
                setCurrentSceneIndex(prev => prev + 1);
            }, 5000); // Auto-advance every 5 seconds
            return () => clearInterval(timer);
        }
    }, [isPlaying, currentSceneIndex]);

    const handleNext = () => {
        setCurrentSceneIndex(prev => Math.min(prev + 1, scenes.length - 1));
    };

    const handlePrev = () => {
        setCurrentSceneIndex(prev => Math.max(prev - 1, 0));
    };

    const progressPercentage = useMemo(() => {
        return ((currentSceneIndex + 1) / scenes.length) * 100;
    }, [currentSceneIndex]);

    const currentScene = scenes[currentSceneIndex];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-4xl relative shadow-2xl border-2 border-gold-accent">
                <button onClick={onExit} className="absolute top-4 right-4 text-gray-500 hover:text-royal-blue z-10">
                    <X size={24} />
                </button>
                <div key={currentSceneIndex} className="animate-fade-in text-center p-8">
                    <div className="flex justify-center items-center mb-6">
                        <div className="bg-royal-blue p-4 rounded-full text-gold-accent">
                            <currentScene.Icon size={40} />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-royal-blue">{currentScene.title}</h2>
                    <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">{currentScene.text}</p>
                    <div className="mt-6 bg-green-50 text-green-800 font-semibold p-3 rounded-lg inline-block">
                        Benefit: {currentScene.benefit}
                    </div>
                </div>

                {/* Video Controls */}
                <div className="px-8 pb-6">
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div className="bg-gold-accent h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease-in-out' }}></div>
                    </div>

                    <div className="flex justify-center items-center space-x-6">
                        <button onClick={handlePrev} disabled={currentSceneIndex === 0} className="text-royal-blue disabled:text-gray-400">
                            <ChevronLeft size={30} />
                        </button>
                        <button onClick={() => setIsPlaying(!isPlaying)} className="bg-royal-blue text-white p-3 rounded-full shadow-lg">
                            {isPlaying ? <Pause size={30} /> : <Play size={30} />}
                        </button>
                        <button onClick={handleNext} disabled={currentSceneIndex === scenes.length - 1} className="text-royal-blue disabled:text-gray-400">
                            <ChevronRight size={30} />
                        </button>
                    </div>
                </div>
            </Card>
             <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default PromoVideo;