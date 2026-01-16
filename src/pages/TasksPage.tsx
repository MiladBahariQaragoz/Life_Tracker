import { useState } from 'react';
import { useStore } from '../context/store';
import { CheckCircle2, Circle, Plus, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function TasksPage() {
    const { tasks, toggleTask, addTask, deleteTask } = useStore();
    const [isAdding, setIsAdding] = useState(false);

    // New Task State
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;
        addTask(title, priority, dueDate || undefined);
        setTitle('');
        setPriority('medium');
        setDueDate('');
        setIsAdding(false);
    };

    const highLoad = tasks.filter(t => t.priority === 'high');
    const mediumLoad = tasks.filter(t => t.priority === 'medium');
    const lowLoad = tasks.filter(t => t.priority === 'low');

    const minimums = tasks.filter(t => t.isMinimum);

    // Mock Calendar Events
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dueToday = tasks.filter(t => t.dueDate === todayStr && !t.completed);

    const events = [
        { id: 'e1', title: 'Calculus Lecture', time: '10:00 AM', duration: '1.5h' },
        { id: 'e2', title: 'Lunch with Sarah', time: '12:30 PM', duration: '1h' },
        ...dueToday.map(t => ({
            id: t.id,
            title: t.title,
            time: 'Due Today',
            duration: t.priority
        }))
    ];

    const TaskRow = ({ task }: { task: any }) => (
        <div className="group flex items-center gap-2">
            <div
                onClick={() => toggleTask(task.id)}
                className={cn(
                    "flex-1 flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all active:scale-[0.99]",
                    task.completed
                        ? "border-zinc-900 bg-zinc-950/50 opacity-50"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
            >
                {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                    <Circle className="h-5 w-5 text-zinc-600 shrink-0" />
                )}
                <div className="flex-1">
                    <span className={cn(
                        "font-medium block",
                        task.completed ? "text-zinc-500 line-through" : "text-white"
                    )}>
                        {task.title}
                    </span>
                    {task.dueDate && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                    )}
                </div>
                {task.isMinimum && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                        MIN
                    </span>
                )}
            </div>
            <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-rose-500 transition-opacity"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Agenda & Tasks</h1>
                    <p className="text-zinc-500">{format(new Date(), 'EEEE, MMMM do')}</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="rounded-full bg-white p-2 text-zinc-950 hover:bg-zinc-200 transition-colors"
                >
                    <Plus className={cn("h-6 w-6 transition-transform", isAdding && "rotate-45")} />
                </button>
            </div>

            {/* Add Task Form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Task Title</label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600 w-full"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600 appearance-none w-full"
                            >
                                <option value="low">Low Release</option>
                                <option value="medium">Medium Load</option>
                                <option value="high">High Cognitive Load</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Due Date (Optional)</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600 w-full"
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
            )}

            <div className="grid gap-8 lg:grid-cols-3">

                {/* Left Col: Agenda/Calendar */}
                <div className="space-y-6 lg:col-span-1">
                    <section>
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                            <CalendarIcon className="h-5 w-5 text-blue-400" />
                            Schedule
                        </h2>
                        <div className="space-y-3">
                            {events.map(event => (
                                <div key={event.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                                    <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-800 p-2 text-xs font-medium text-zinc-400 w-16 h-14 shrink-0">
                                        <Clock className="w-4 h-4 mb-1" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">{event.title}</h3>
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            {event.time} • {event.duration}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && <p className="text-zinc-600 italic">No events today.</p>}
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                            Miniumums
                        </h2>
                        <div className="space-y-2">
                            {minimums.map(t => <TaskRow key={t.id} task={t} />)}
                        </div>
                    </section>
                </div>

                {/* Right Col: Cognitive Buckets */}
                <div className="space-y-6 lg:col-span-2">

                    {/* High Load */}
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-rose-400">High Cognitive Load</h2>
                            <span className="text-xs text-zinc-600">Deep Work</span>
                        </div>
                        <div className="space-y-2">
                            {highLoad.length === 0 && <p className="text-sm text-zinc-600 italic">No high load tasks.</p>}
                            {highLoad.map(t => <TaskRow key={t.id} task={t} />)}
                        </div>
                    </section>

                    {/* Medium Load */}
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-amber-400">Medium Load</h2>
                            <span className="text-xs text-zinc-600">Standard</span>
                        </div>
                        <div className="space-y-2">
                            {mediumLoad.length === 0 && <p className="text-sm text-zinc-600 italic">No medium load tasks.</p>}
                            {mediumLoad.map(t => <TaskRow key={t.id} task={t} />)}
                        </div>
                    </section>

                    {/* Low Load */}
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-emerald-400">Low Load</h2>
                            <span className="text-xs text-zinc-600">Admin / Chores</span>
                        </div>
                        <div className="space-y-2">
                            {lowLoad.length === 0 && <p className="text-sm text-zinc-600 italic">No low load tasks.</p>}
                            {lowLoad.map(t => <TaskRow key={t.id} task={t} />)}
                        </div>
                    </section>

                </div>

            </div>

        </div>
    );
}
