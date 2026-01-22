import { useState } from 'react';
import { useStore } from '../context/store';
import { Calendar, ChevronRight, Plus, Trash2, Upload, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

export function StudyPage() {
    const { exams, addExam, deleteExam, addTopic } = useStore();
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

    // Import Logic
    const downloadTemplate = () => {
        const headers = "Exam Name,Exam Date (YYYY-MM-DD),Topic Name,Topic Goal (Sessions)";
        const sample = "Math 101,2025-05-01,Algebra,10\nMath 101,2025-05-01,Calculus,12\nPhysics,2025-06-15,Mechanics,8";
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "exam_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            // Skip header if exists (check if first line has 'Exam Name')
            const startIndex = lines[0].toLowerCase().includes('exam name') ? 1 : 0;

            const newExams = new Map<string, { date: string, topics: { name: string, goal: number }[] }>();

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Allow comma or semicolon (Excel sometimes uses ;)
                const parts = line.split(/[,;]/).map(p => p.trim());
                if (parts.length < 4) continue;

                const [examName, examDate, topicName, topicGoal] = parts;

                if (!newExams.has(examName)) {
                    newExams.set(examName, { date: examDate, topics: [] });
                }
                newExams.get(examName)?.topics.push({
                    name: topicName,
                    goal: Number(topicGoal) || 5
                });
            }

            // Process Store Actions
            newExams.forEach((data, examName) => {
                const newExamId = addExam(examName, data.date);
                if (newExamId) {
                    data.topics.forEach(topic => {
                        addTopic(newExamId, topic.name, topic.goal);
                    });
                }
            });
            alert(`Imported ${newExams.size} exams successfully.`);

            // Actually, I'll allow this for now but I need to update store to return ID.
            // Let's stop and update store.tsx first to make `addExam` return the ID.
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Study Planner</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={downloadTemplate}
                            className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                        >
                            <Download className="w-3 h-3" /> Template
                        </button>
                        <label className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                            <Upload className="w-3 h-3" /> Import CSV
                            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>
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
                    const totalSessions = exam.topics.reduce((acc, t) => acc + t.totalSessionsGoal, 0);
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
                                    deleteExam(exam.id);
                                }}
                                className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-rose-500 transition-colors bg-zinc-900/80 rounded-full z-20"
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
