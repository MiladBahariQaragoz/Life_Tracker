import { format } from 'date-fns';
import { useStore } from '../context/store';
import { Dumbbell, BookOpen, AlertCircle, TrendingUp, Sparkles, Loader2, ArrowUpRight } from 'lucide-react';
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
            setPlanAdvice("ERR: AI_COACH_UNREACHABLE");
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
    const formattedDate = format(today, 'yyyy.MM.dd');

    const minimumTasks = tasks.filter(t => t.isMinimum);
    const tasksDone = tasks.filter(t => t.completed).length;
    const tasksTotal = tasks.length;

    const todaysWorkout = gymPlans.length > 0 ? gymPlans[0] : null;

    const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextExam = sortedExams.length > 0 ? sortedExams[0] : null;
    const daysUntilExam = nextExam
        ? Math.ceil((new Date(nextExam.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-10 font-sans">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-800 pb-6">
                <div>
                    <h1 className="font-display text-5xl font-bold text-white uppercase tracking-tight">STATUS.OVERVIEW</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="bg-zinc-200 text-zinc-950 px-2 py-0.5 text-xs font-bold font-mono">SYS.DATE</span>
                        <p className="text-zinc-400 font-mono text-sm tracking-widest">{formattedDate}</p>
                    </div>
                </div>

                <button
                    onClick={handlePlanDay}
                    disabled={isPlanning}
                    className="group flex items-center gap-3 px-6 py-3 bg-zinc-200 hover:bg-white text-zinc-950 font-bold font-mono text-sm uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Initialize Plan</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
            </div>

            {planAdvice && (
                <div className="bg-zinc-900 border-l-4 border-zinc-200 p-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-4 text-zinc-200">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-mono font-bold uppercase tracking-widest text-sm">AI.DIRECTIVE</h3>
                    </div>
                    <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                        {planAdvice}
                    </div>
                    <button
                        onClick={() => setPlanAdvice(null)}
                        className="mt-6 text-xs text-zinc-600 hover:text-zinc-300 font-mono uppercase tracking-widest transition-colors"
                    >
                        [ Acknowledge & Dismiss ]
                    </button>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 bg-zinc-800 p-[1px]">
                {/* Gym Stat */}
                <div
                    onClick={() => navigate('/gym')}
                    className="group cursor-pointer bg-zinc-950 p-6 transition-colors hover:bg-zinc-900 relative overflow-hidden"
                >
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Dumbbell className="h-32 w-32" />
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 mb-6 font-mono text-xs uppercase tracking-widest">
                        <Dumbbell className="h-4 w-4" />
                        <span>Physical</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-white uppercase mb-1">{todaysWorkout ? todaysWorkout.dayName : 'STANDBY'}</p>
                    <p className="font-mono text-xs text-zinc-500">{todaysWorkout ? `${todaysWorkout.exercises.length} PROTOCOLS` : 'NO ACTIVE PLAN'}</p>
                </div>

                {/* Study Stat */}
                <div
                    onClick={() => navigate('/study')}
                    className="group cursor-pointer bg-zinc-950 p-6 transition-colors hover:bg-zinc-900 relative overflow-hidden"
                >
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BookOpen className="h-32 w-32" />
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 mb-6 font-mono text-xs uppercase tracking-widest">
                        <BookOpen className="h-4 w-4" />
                        <span>Cognitive</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-white uppercase mb-1">{nextExam ? nextExam.name : 'CLEAR'}</p>
                    <p className="font-mono text-xs text-zinc-500">{nextExam ? `T-MINUS ${daysUntilExam} DAYS` : 'NO PENDING EXAMS'}</p>
                </div>

                {/* Tasks Stat */}
                <div
                    onClick={() => navigate('/tasks')}
                    className="group cursor-pointer bg-zinc-950 p-6 transition-colors hover:bg-zinc-900 relative overflow-hidden"
                >
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertCircle className="h-32 w-32" />
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 mb-6 font-mono text-xs uppercase tracking-widest">
                        <AlertCircle className="h-4 w-4" />
                        <span>Operations</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-white uppercase mb-1">{tasksTotal - tasksDone} PENDING</p>
                    <p className="font-mono text-xs text-zinc-500">{tasksDone} RESOLVED</p>
                </div>
            </div>

            {/* Today's Minimum Section */}
            <section className="border-t border-zinc-800 pt-8">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Priority.Targets</h2>
                    <span className="bg-red-900/30 text-red-500 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest">Non-Negotiable</span>
                </div>
                <div className="space-y-2">
                    {minimumTasks.map(task => (
                        <div
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className={cn(
                                "group flex cursor-pointer items-center gap-4 border p-4 transition-all",
                                task.completed
                                    ? "border-zinc-800 bg-zinc-950 opacity-50 grayscale"
                                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-6 h-6 border transition-colors",
                                task.completed ? "border-zinc-600 bg-zinc-800" : "border-zinc-400 group-hover:border-white"
                            )}>
                                {task.completed && <div className="w-3 h-3 bg-zinc-400" />}
                            </div>
                            <span className={cn(
                                "font-mono text-sm tracking-wide uppercase",
                                task.completed ? "text-zinc-600 line-through" : "text-white group-hover:text-zinc-200"
                            )}>
                                {task.title}
                            </span>
                        </div>
                    ))}
                    {minimumTasks.length === 0 && (
                        <div className="border border-dashed border-zinc-800 p-8 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                            No priority targets defined
                        </div>
                    )}
                </div>
            </section>

            {/* Analytics Section */}
            <section className="space-y-8 border-t border-zinc-800 pt-8">
                <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-zinc-500" />
                    <h2 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Telemetry.Data</h2>
                </div>

                <div className="border border-zinc-800 bg-zinc-950 p-6">
                    <ProductivityHeatmap data={activityData} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="border border-zinc-800 bg-zinc-950 p-6">
                        <VolumeProgression data={volumeData} />
                    </div>
                    <div className="border border-zinc-800 bg-zinc-950 p-6">
                        <TopicMasteryRadar data={masteryData} />
                    </div>
                </div>
            </section>

        </div>
    );
}