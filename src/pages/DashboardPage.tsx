import { format } from 'date-fns';
import { useStore } from '../context/store';
import { CheckCircle2, Circle, Dumbbell, BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
    const { tasks, gymPlans, exams, toggleTask } = useStore();
    const navigate = useNavigate();

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
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">{formattedDate}</h1>
                <p className="text-zinc-500">Focus on the essential.</p>
            </div>

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
