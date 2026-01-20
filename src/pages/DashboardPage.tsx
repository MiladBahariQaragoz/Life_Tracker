import { format } from 'date-fns';
import { useStore } from '../context/store';
import { CheckCircle2, Circle, Dumbbell, BookOpen, AlertCircle, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ProductivityHeatmap } from '../components/analytics/ProductivityHeatmap';
import { VolumeProgression } from '../components/analytics/VolumeProgression';
import { TopicMasteryRadar } from '../components/analytics/TopicMasteryRadar';

export function DashboardPage() {
    const { tasks, gymPlans, exams, toggleTask, askAiCoach } = useStore();
    const navigate = useNavigate();

    const [isPlanning, setIsPlanning] = useState(false);
    const [planAdvice, setPlanAdvice] = useState<string | null>(null);

    const handlePlanDay = async () => {
        setIsPlanning(true);
        setPlanAdvice(null);
        try {
            const advice = await askAiCoach('plan');
            setPlanAdvice(advice);
        } catch (e) {
            setPlanAdvice("Failed to generate plan.");
        } finally {
            setIsPlanning(false);
        }
    };

    const [activityData, setActivityData] = useState([]);
    const [volumeData, setVolumeData] = useState([]);
    const [masteryData, setMasteryData] = useState([]);

    useEffect(() => {
        api.getAnalyticsActivity().then(setActivityData);
        api.getAnalyticsVolume().then(setVolumeData);
        api.getAnalyticsMastery().then(setMasteryData);
    }, []);

    const today = new Date();
    const formattedDate = format(today, 'EEEE, MMMM do');

    // Tasks Logic
    const minimumTasks = tasks.filter(t => t.isMinimum);
    const tasksDone = tasks.filter(t => t.completed).length;
    const tasksTotal = tasks.length;

    // Gym Logic (Mock: Assume first plan is today's for demo)
    const todaysWorkout = gymPlans.length > 0 ? gymPlans[0] : null;

    // Study Logic
    const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextExam = sortedExams.length > 0 ? sortedExams[0] : null;
    const daysUntilExam = nextExam
        ? Math.ceil((new Date(nextExam.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{formattedDate}</h1>
                    <p className="text-zinc-500">Focus on the essential.</p>
                </div>

                <button
                    onClick={handlePlanDay}
                    disabled={isPlanning}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-semibold text-white shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50"
                >
                    {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Plan My Day
                </button>
            </div>

            {planAdvice && (
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-cyan-900/30 rounded-xl p-6 shadow-xl animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-3 text-cyan-400">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-bold">AI Strategic Plan</h3>
                    </div>
                    <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {planAdvice}
                    </div>
                    <button
                        onClick={() => setPlanAdvice(null)}
                        className="mt-4 text-xs text-zinc-500 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Gym Stat */}
                <div
                    onClick={() => navigate('/gym')}
                    className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                >
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <Dumbbell className="h-5 w-5" />
                        <span className="font-semibold">Gym</span>
                    </div>
                    <p className="text-lg font-medium text-white">{todaysWorkout ? todaysWorkout.dayName : 'No Plan'}</p>
                    <p className="text-sm text-zinc-500">{todaysWorkout ? todaysWorkout.exercises.length : 0} Exercises</p>
                </div>

                {/* Study Stat */}
                <div
                    onClick={() => navigate('/study')}
                    className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                >
                    <div className="flex items-center gap-3 text-blue-400 mb-2">
                        <BookOpen className="h-5 w-5" />
                        <span className="font-semibold">Study</span>
                    </div>
                    <p className="text-lg font-medium text-white">{nextExam ? nextExam.name : 'No Exams'}</p>
                    <p className="text-sm text-zinc-500">{nextExam ? `${daysUntilExam} days left` : 'All caught up'}</p>
                </div>

                {/* Tasks Stat */}
                <div
                    onClick={() => navigate('/tasks')}
                    className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                >
                    <div className="flex items-center gap-3 text-amber-400 mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Tasks</span>
                    </div>
                    <p className="text-lg font-medium text-white">{tasksTotal - tasksDone} Remaining</p>
                    <p className="text-sm text-zinc-500">{tasksDone} Completed</p>
                </div>
            </div>

            {/* Analytics Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-xl font-semibold text-white">Analytics</h2>
                </div>

                <ProductivityHeatmap data={activityData} />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <VolumeProgression data={volumeData} />
                    <TopicMasteryRadar data={masteryData} />
                </div>
            </section>


            {/* Today's Minimum Section */}
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Today's Minimum</h2>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Non-Negotiable</span>
                </div>
                <div className="space-y-3">
                    {minimumTasks.map(task => (
                        <div
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className={cn(
                                "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all active:scale-[0.98]",
                                task.completed
                                    ? "border-zinc-900 bg-zinc-950/50 opacity-50"
                                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                            )}
                        >
                            {task.completed ? (
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                            ) : (
                                <Circle className="h-6 w-6 text-zinc-600 shrink-0" />
                            )}
                            <span className={cn(
                                "text-lg font-medium",
                                task.completed ? "text-zinc-500 line-through" : "text-white"
                            )}>
                                {task.title}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    );
}
