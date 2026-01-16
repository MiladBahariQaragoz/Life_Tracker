import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/store';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export function ExamDetailPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { exams, logStudySession } = useStore();

    const exam = exams.find(e => e.id === examId);

    const [activeTopic, setActiveTopic] = useState<string | null>(null);

    if (!exam) return <div>Exam not found</div>;

    const handleSession = (topicId: string, quality: 'light' | 'normal' | 'deep') => {
        logStudySession(exam.id, topicId, quality);
        // Maybe flash success or close expand
        setActiveTopic(null);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">

            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/study')}
                    className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">{exam.name}</h1>
                    <p className="text-sm text-zinc-500">Breakdown by Topic</p>
                </div>
            </div>

            {/* Topics List */}
            <div className="space-y-3">
                {exam.topics.map(topic => {
                    const progress = Math.min(100, Math.round((topic.sessionsCompleted / topic.totalSessionsInitial) * 100));
                    const isExpanded = activeTopic === topic.id;

                    return (
                        <div key={topic.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all">
                            <div
                                onClick={() => setActiveTopic(isExpanded ? null : topic.id)}
                                className="flex cursor-pointer items-center justify-between p-4 hover:bg-zinc-800/50"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-zinc-200">{topic.name}</h3>
                                        <span className="text-xs text-zinc-500">{topic.sessionsCompleted}/{topic.totalSessionsInitial}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                                        <div
                                            className={cn("h-full transition-all duration-500", progress >= 100 ? "bg-emerald-500" : "bg-blue-600/70")}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Log Action (Expanded) */}
                            {isExpanded && (
                                <div className="border-t border-zinc-800 bg-black/20 p-4 animate-in slide-in-from-top-2">
                                    <p className="mb-3 text-sm font-medium text-zinc-400">Log Session Quality:</p>
                                    <div className="flex gap-2">
                                        {['light', 'normal', 'deep'].map((q) => (
                                            <button
                                                key={q}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSession(topic.id, q as any);
                                                }}
                                                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-sm font-medium text-zinc-300 hover:border-blue-500 hover:bg-zinc-700 hover:text-white active:scale-95 transition-all capitalize"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
