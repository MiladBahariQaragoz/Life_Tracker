import { useState } from 'react';
import { useStore } from '../context/store';
import { Calendar, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

export function StudyPage() {
    const { exams, addExam, deleteExam } = useStore();
    const navigate = useNavigate();
    const [isAdding, setIsAdding] = useState(false);

    // New Exam State
    const [name, setName] = useState('');
    const [date, setDate] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !date) return;
        addExam(name, date);
        setName('');
        setDate('');
        setIsAdding(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Study Planner</h1>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="rounded-full bg-white p-2 text-zinc-950 hover:bg-zinc-200 transition-colors"
                >
                    <Plus className={cn("h-6 w-6 transition-transform", isAdding && "rotate-45")} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col sm:flex-row gap-2 animate-in fade-in">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Exam Name (e.g. Physics I)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                    />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                    />
                    <button
                        type="submit"
                        disabled={!name || !date}
                        className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 disabled:opacity-50"
                    >
                        Add
                    </button>
                </form>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                {exams.map((exam) => {
                    const totalSessions = exam.topics.reduce((acc, t) => acc + t.totalSessionsInitial, 0);
                    const completedSessions = exam.topics.reduce((acc, t) => acc + t.sessionsCompleted, 0);
                    const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

                    let daysLeftComponent = "";
                    try {
                        daysLeftComponent = formatDistanceToNow(new Date(exam.date), { addSuffix: true });
                    } catch (e) {
                        daysLeftComponent = "Unknown date";
                    }

                    return (
                        <div
                            key={exam.id}
                            className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
                        >
                            <div
                                onClick={() => navigate(`/study/${exam.id}`)}
                                className="cursor-pointer"
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex-1 pr-8">
                                        <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{exam.name}</h2>
                                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Calendar className="h-3 w-3" />
                                            <span>Exam {daysLeftComponent}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400" />
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-2 flex items-end justify-between text-sm">
                                    <span className="text-zinc-400">{completedSessions} / {totalSessions} sessions</span>
                                    <span className={progress >= 100 ? "text-emerald-500" : "text-zinc-500"}>{progress}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this exam?')) deleteExam(exam.id);
                                }}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-rose-500 transition-opacity bg-zinc-900/80 rounded-full"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
