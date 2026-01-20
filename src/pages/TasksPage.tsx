import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useStore } from '../context/store';
import { Plus, Calendar as CalendarIcon, Clock, Trash2, X, CheckCircle, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useUserStats } from '../context/UserStatsContext';

export function TasksPage() {
    const { tasks, toggleTask, addTask, deleteTask } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);



    // New Task State
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;
        addTask(title, priority, dueDate || undefined, importance);
        setTitle('');
        setPriority('medium');
        setImportance('medium');
        setDueDate('');
        setIsAdding(false);
    };

    // Filter tasks
    const activeTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

    useEffect(() => {
        api.getCalendarEvents().then(setCalendarEvents);
    }, []);

    // Combine Real Events with Tasks Due Today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dueToday = tasks.filter(t => t.dueDate === todayStr && !t.completed);

    const events = [
        ...calendarEvents,
        ...dueToday.map(t => ({
            id: t.id,
            title: t.title,
            time: 'Due Today',
            duration: t.priority
        }))
    ];

    // Helper to filter tasks by cell
    const getTasksForCell = (load: 'low' | 'medium' | 'high', imp: 'low' | 'medium' | 'high') => {
        return activeTasks.filter(t => t.priority === load && (t.importance || 'medium') === imp);
    };

    const handleToggle = async (taskId: string) => {
        await toggleTask(taskId);
    };

    const TaskNode = ({ task }: { task: any }) => (
        <div
            className={cn(
                "group relative flex items-center gap-2 rounded-lg border p-2 text-sm shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer",
                task.priority === 'high' ? "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20" :
                    task.priority === 'medium' ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20" :
                        "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
            )}
            title={`${task.title} (Load: ${task.priority}, Imp: ${task.importance})`}
        >
            <div onClick={() => handleToggle(task.id)} className="flex-1 truncate font-medium text-zinc-200">
                {task.title}
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500"
            >
                <Trash2 className="w-3 h-3" />
            </button>
            {task.dueDate && (
                <div className="absolute -top-2 -right-1 rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400 border border-zinc-700">
                    {format(new Date(task.dueDate), 'MMM d')}
                </div>
            )}
        </div>
    );

    const MatrixCell = ({ load, imp }: { load: 'low' | 'medium' | 'high', imp: 'low' | 'medium' | 'high' }) => {
        const cellTasks = getTasksForCell(load, imp);
        return (
            <div className="relative min-h-[120px] rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-2 hover:bg-zinc-900/40 transition-colors">
                {/* Cell Label (Only show on edges?) Optional */}
                <div className="flex flex-wrap content-start gap-2">
                    {cellTasks.map(t => <TaskNode key={t.id} task={t} />)}
                    {cellTasks.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-zinc-800" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">



            {/* Header / Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white">Task Matrix</h1>
                    <p className="text-zinc-500">{activeTasks.length} Active Tasks • {completedTasks.length} Completed</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>High Load</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Med Load</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Low Load</span>
                    </div>

                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="rounded-full bg-zinc-800 p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        title={showCompleted ? "Show Matrix" : "Show Completed"}
                    >
                        {showCompleted ? <LayoutGrid className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                    </button>

                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="rounded-full bg-white p-2 text-zinc-950 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                    >
                        <Plus className={cn("h-6 w-6 transition-transform", isAdding && "rotate-45")} />
                    </button>
                </div>
            </div>

            {/* Add Task Form Overlay */}
            {isAdding && (
                <div className="absolute top-20 left-0 right-0 z-50 mx-auto max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Task Title</label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase">Cognitive Load (X-Axis)</label>
                                    <div className="flex gap-2">
                                        {(['low', 'medium', 'high'] as const).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                                                    priority === p
                                                        ? "bg-white text-black border-white"
                                                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600"
                                                )}
                                            >
                                                {p.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase">Importance (Y-Axis)</label>
                                    <div className="flex gap-2">
                                        {(['low', 'medium', 'high'] as const).map(i => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setImportance(i)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                                                    importance === i
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600"
                                                )}
                                            >
                                                {i.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-zinc-500 uppercase">Due Date (Optional)</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600 w-full h-full"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!title}
                                className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-zinc-200 disabled:opacity-50"
                            >
                                Create Task
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 2D MATRIX */}
            {/* 2D MATRIX or COMPLETED LIST */}
            {showCompleted ? (
                <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950/30 rounded-2xl border border-zinc-800 p-4 animate-in slide-in-from-right-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        Completed Tasks
                    </h2>
                    <div className="flex flex-wrap gap-2 content-start">
                        {completedTasks.length === 0 && (
                            <p className="text-zinc-500 text-sm">No completed tasks yet.</p>
                        )}
                        {completedTasks.map(t => (
                            <TaskNode key={t.id} task={t} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-2 min-h-0 animate-in slide-in-from-left-4">

                    {/* Y-Axis Label */}
                    <div className="flex flex-col justify-between py-8 pr-2 text-xs font-bold text-zinc-500 tracking-widest [writing-mode:vertical-rl] rotate-180">
                        <span>HIGH IMPORTANCE</span>
                        <span>MEDIUM</span>
                        <span>LOW IMPORTANCE</span>
                    </div>

                    {/* Grid Content */}
                    <div className="grid grid-cols-3 grid-rows-3 gap-2 bg-zinc-950/50 rounded-2xl border border-zinc-800 p-2 shadow-inner">

                        {/* Top Row (High Importance) */}
                        <MatrixCell load="low" imp="high" />
                        <MatrixCell load="medium" imp="high" />
                        <MatrixCell load="high" imp="high" />

                        {/* Mid Row (Medium Importance) */}
                        <MatrixCell load="low" imp="medium" />
                        <MatrixCell load="medium" imp="medium" />
                        <MatrixCell load="high" imp="medium" />

                        {/* Bot Row (Low Importance) */}
                        <MatrixCell load="low" imp="low" />
                        <MatrixCell load="medium" imp="low" />
                        <MatrixCell load="high" imp="low" />

                    </div>

                    {/* Corner (Empty) */}
                    <div></div>

                    {/* X-Axis Label */}
                    <div className="flex justify-between px-12 pt-1 text-xs font-bold text-zinc-500 tracking-widest">
                        <span>LOW LOAD</span>
                        <span>MEDIUM LOAD</span>
                        <span>HIGH LOAD</span>
                    </div>
                </div>
            )}

            {/* Schedule / Sidebar (Collapsible? Or just hidden for now to focus on matrix?) 
                Let's put Calendar at the bottom or separate tab. For now, maybe just a small bar.
            */}
            <div className="h-24 shrink-0 flex gap-4 overflow-x-auto pb-2 border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-2 px-4 shrink-0 text-zinc-500 font-semibold text-sm">
                    <CalendarIcon className="h-4 w-4" /> Schedule
                </div>
                {events.map(e => (
                    <div key={e.id} className="shrink-0 flex flex-col justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 min-w-[120px]">
                        <span className="text-xs font-medium text-white truncate max-w-[150px]">{e.title}</span>
                        <span className="text-[10px] text-zinc-500">{e.time}</span>
                    </div>
                ))}
                {events.length === 0 && <span className="text-xs text-zinc-600 flex items-center">No events today</span>}
            </div>

        </div>
    );
}
