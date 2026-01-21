import { useState, useMemo } from 'react';
import { useStore } from '../context/store';
import { useUserStats } from '../context/UserStatsContext';
import { ChevronRight, Plus, Trash2, X, Trophy, Sparkles, Loader2, PlayCircle, Calendar, Dumbbell, Edit2 } from 'lucide-react';
import XPBreakdown from '../components/XPBreakdown';
import type { XPResult } from '../types';

import { cn } from '../lib/utils';


export function GymPage() {
    const {
        gymPlans, addGymPlan, deleteGymPlan, gymMoves, addExerciseToPlan,
        weeklySchedule, generateWeeklySchedule, updateScheduleItem, completeScheduleItem
    } = useStore();
    const { addXp } = useUserStats();

    const [activeTab, setActiveTab] = useState<'schedule' | 'templates'>('schedule');

    // Schedule State
    const [daysPerWeek, setDaysPerWeek] = useState(4);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

    // Templates / Plan Editor State
    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');
    const [addingToPlanId, setAddingToPlanId] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string>('All');

    // Image Viewer State
    const [viewingMove, setViewingMove] = useState<{ name: string, imageUrl?: string } | null>(null);

    // XP Modal State
    const [lastXPResult, setLastXPResult] = useState<XPResult | null>(null);

    // Active Workout Session (from Schedule)
    const [activeSessionPlanId, setActiveSessionPlanId] = useState<string | null>(null);

    const handleGenerateSchedule = async () => {
        setIsGeneratingSchedule(true);
        try {
            // Start from today (Monday of current week ideally, but let's just say today)
            // Actually, let's find the current week's Monday
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(now.setDate(diff));
            const startDate = monday.toISOString().split('T')[0];

            await generateWeeklySchedule(daysPerWeek, startDate);
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule");
        } finally {
            setIsGeneratingSchedule(false);
        }
    };

    const handleAddReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlanName) return;
        addGymPlan(newPlanName);
        setNewPlanName('');
        setIsAddingPlan(false);
    };

    const handleAddMove = (moveName: string) => {
        if (!addingToPlanId) return;
        addExerciseToPlan(addingToPlanId, moveName);
        setAddingToPlanId(null);
    };

    const handleExerciseClick = (moveName: string) => {
        const move = gymMoves.find(m => m.name === moveName);
        if (move) {
            setViewingMove({ name: move.name, imageUrl: move.imageUrl });
        }
    };

    const handleXPUpdate = (result: any) => {
        if (result && result.breakdown) {
            setLastXPResult({
                totalXP: result.totalSessionXP,
                breakdown: result.breakdown,
                multipliersApplied: result.multipliers || [],
                capsApplied: result.caps || { softCapHit: false, hardCapHit: false }
            });
            if (result.xpGained) {
                addXp(result.xpGained, 'Gym Set');
            }
        }
    };

    // Group moves
    const groups = useMemo(() => Array.from(new Set(gymMoves.map(m => m.group).filter(g => g && g.trim() !== ''))).sort(), [gymMoves]);
    const filteredMoves = useMemo(() => selectedGroup === 'All'
        ? gymMoves
        : gymMoves.filter(m => m.group === selectedGroup), [gymMoves, selectedGroup]);

    // Schedule: Get current week dates
    const weekDates = useMemo(() => {
        const dates = [];
        const now = new Date();
        const currentDay = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // adjust to Monday
        const monday = new Date(now.setDate(diff));

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* XP Modal Overlay */}
            {lastXPResult && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in cursor-pointer" onClick={() => setLastXPResult(null)}>
                    <div onClick={e => e.stopPropagation()} className="max-w-md w-full">
                        <div className="flex justify-end mb-2">
                            <button onClick={() => setLastXPResult(null)} className="text-white hover:text-gray-300"><X /></button>
                        </div>
                        <XPBreakdown result={lastXPResult} />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Gym & Workouts</h1>

                {/* Tabs */}
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'schedule' ? "bg-zinc-800 text-cyan-400 shadow-sm" : "text-zinc-400 hover:text-white")}
                    >
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Weekly Schedule
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'templates' ? "bg-zinc-800 text-cyan-400 shadow-sm" : "text-zinc-400 hover:text-white")}
                    >
                        <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" /> Plan Editor
                        </div>
                    </button>
                </div>
            </div>

            {/* --- SCHEDULE TAB --- */}
            {activeTab === 'schedule' && (
                <div className="space-y-6 animate-in slide-in-from-left-4">
                    {/* Controls */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                            <label className="text-sm text-zinc-400">Target Days/Week:</label>
                            <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                                {[3, 4, 5, 6].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setDaysPerWeek(num)}
                                        className={cn("w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors", daysPerWeek === num ? "bg-cyan-900 text-cyan-400" : "text-zinc-500 hover:text-zinc-300")}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateSchedule}
                            disabled={isGeneratingSchedule}
                            className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate AI Schedule
                        </button>
                    </div>

                    {/* Week View */}
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {weekDates.map(date => {
                            const dateObj = new Date(date);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = dateObj.getDate();
                            const isToday = new Date().toISOString().split('T')[0] === date;

                            const scheduledItem = weeklySchedule.find(i => i.date === date);
                            const plan = scheduledItem ? gymPlans.find(p => p.id === scheduledItem.planId) : null;



                            return (
                                <div key={date} className={cn("rounded-xl border p-4 flex flex-col min-h-[200px] relative transition-all group/day",
                                    isToday ? "border-cyan-500/50 bg-cyan-950/10 ring-1 ring-cyan-500/20" : "border-zinc-800 bg-zinc-900/40",
                                    !plan && "opacity-75 hover:opacity-100"
                                )}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-center">
                                            <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{dayName}</div>
                                            <div className={cn("text-xl font-bold", isToday ? "text-white" : "text-zinc-400")}>{dayNum}</div>
                                        </div>
                                        {plan && (
                                            <div className={cn("w-2 h-2 rounded-full", scheduledItem.isDone ? "bg-green-500" : "bg-cyan-500")} />
                                        )}

                                        {/* Edit Controls (Hover) */}
                                        <div className="opacity-0 group-hover/day:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1">
                                            <PlanSelector
                                                currentPlanId={plan?.id || null}
                                                plans={gymPlans}
                                                onSelect={(newPlanId) => updateScheduleItem(date, newPlanId)}
                                            />
                                        </div>
                                    </div>

                                    {plan ? (
                                        <div className="flex-1 flex flex-col">
                                            <h3 className="font-bold text-white mb-1 line-clamp-2">{plan.dayName}</h3>
                                            <p className="text-xs text-zinc-500 mb-4">{plan.exercises.length} Exercises</p>

                                            <div className="mt-auto">
                                                {scheduledItem.isDone ? (
                                                    <div className="w-full py-2 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-center gap-2 text-green-400 text-sm font-bold">
                                                        <Trophy className="w-4 h-4" /> Completed
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setActiveSessionPlanId(plan.id)}
                                                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                                                    >
                                                        <PlayCircle className="w-4 h-4" /> Start
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                            <div className="text-sm text-zinc-600 italic">Rest Day</div>
                                            <PlanSelector
                                                currentPlanId={null}
                                                plans={gymPlans}
                                                onSelect={(newPlanId) => updateScheduleItem(date, newPlanId)}
                                                trigger={
                                                    <button className="text-xs text-cyan-600 hover:text-cyan-400 font-bold border border-cyan-900 bg-cyan-950/50 px-3 py-1 rounded-full opacity-0 group-hover/day:opacity-100 transition-all">
                                                        + Add Workout
                                                    </button>
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Active Session Overlay */}
                    {activeSessionPlanId && (
                        <div className="fixed inset-0 z-50 bg-black animate-in slide-in-from-bottom duration-300 overflow-y-auto">
                            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                                <div className="flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur py-4 z-10 border-b border-zinc-800">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveSessionPlanId(null)} className="p-2 hover:bg-zinc-900 rounded-full">
                                            <ChevronRight className="w-6 h-6 rotate-180" />
                                        </button>
                                        <h2 className="text-2xl font-bold text-white">
                                            {gymPlans.find(p => p.id === activeSessionPlanId)?.dayName}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={() => {
                                            // Find scheduled item ID for today (or selected day?) - Assuming today for interaction flow simplicity
                                            // In reality we should pass the item ID.
                                            // Let's find the item that matches planId and today? Or just allow marking done.
                                            // Ideally we pass item ID to this view.

                                            // Create "Finish Workout" logic which marks schedule complete
                                            const today = new Date().toISOString().split('T')[0];
                                            const item = weeklySchedule.find(i => i.planId === activeSessionPlanId && i.date === today); // best effort
                                            if (item) completeScheduleItem(item.id, true);

                                            setActiveSessionPlanId(null);
                                        }}
                                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-bold transition-colors"
                                    >
                                        Finish Workout
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {gymPlans.find(p => p.id === activeSessionPlanId)?.exercises.map((exercise) => (
                                        <ExerciseItem
                                            key={exercise.id}
                                            exercise={exercise}
                                            planId={activeSessionPlanId}
                                            onViewImage={() => handleExerciseClick(exercise.name)}
                                            onLogComplete={handleXPUpdate}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TEMPLATES (PLAN EDITOR) TAB --- */}
            {activeTab === 'templates' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                        <h2 className="text-xl font-semibold text-white">Your Templates</h2>
                        <button
                            onClick={() => setIsAddingPlan(!isAddingPlan)}
                            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-zinc-200 transition-colors"
                        >
                            <Plus className={cn("h-4 w-4 transition-transform", isAddingPlan && "rotate-45")} />
                            New Template
                        </button>
                    </div>

                    {isAddingPlan && (
                        <form onSubmit={handleAddReport} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-2 animate-in fade-in">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Template Name (e.g. Leg Day)"
                                value={newPlanName}
                                onChange={(e) => setNewPlanName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                            />
                            <button type="submit" disabled={!newPlanName} className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 disabled:opacity-50">
                                Create
                            </button>
                        </form>
                    )}

                    <div className="space-y-8">
                        {gymPlans.length === 0 && (
                            <div className="text-center py-12 text-zinc-500">
                                <p>No workout templates yet.</p>
                                <p className="text-sm">Create templates like "Push", "Pull", "Legs" so the AI can schedule them for you.</p>
                            </div>
                        )}
                        {gymPlans.map((plan) => (
                            <div key={plan.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 group/plan">
                                <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">{plan.dayName}</h2>
                                        <p className="text-sm text-zinc-500">{plan.exercises.length} Exercises</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setAddingToPlanId(plan.id); }}
                                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                                            title="Add Exercise"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteGymPlan(plan.id); }}
                                            className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                                            title="Delete Template"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="divide-y divide-zinc-800/50">
                                    {plan.exercises.map((exercise) => (
                                        <ExerciseItem
                                            key={exercise.id}
                                            exercise={exercise}
                                            planId={plan.id}
                                            onViewImage={() => handleExerciseClick(exercise.name)}
                                            onLogComplete={handleXPUpdate}
                                        />
                                    ))}
                                    {plan.exercises.length === 0 && (
                                        <div className="p-4 text-center text-sm text-zinc-600 italic">No exercises yet. Add one!</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Exercise Modal (Shared) */}
            {addingToPlanId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 flex-none">
                            <h3 className="font-semibold text-white">Add Exercise</h3>
                            <button onClick={() => setAddingToPlanId(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        {/* Group Filter */}
                        <div className="p-2 border-b border-zinc-800 flex gap-2 overflow-x-auto no-scrollbar flex-none">
                            <button onClick={() => setSelectedGroup('All')} className={cn("px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors shrink-0", selectedGroup === 'All' ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white")}>All</button>
                            {groups.map(g => (
                                <button key={g} onClick={() => setSelectedGroup(g)} className={cn("px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors shrink-0", selectedGroup === g ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white")}>{g}</button>
                            ))}
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredMoves.map(move => (
                                <button key={move.name} onClick={() => handleAddMove(move.name)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">{move.name}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Viewer (Shared) */}
            {viewingMove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in" onClick={() => setViewingMove(null)}>
                    <div className="relative max-w-4xl max-h-screen w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setViewingMove(null)} className="absolute -top-12 right-0 md:top-0 md:-right-12 p-2 text-white hover:text-zinc-300 transition-colors"><X className="w-8 h-8" /></button>
                        {viewingMove.imageUrl ? (
                            <img src={viewingMove.imageUrl} alt={viewingMove.name} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-zinc-900" />
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-lg text-zinc-400 text-center w-full aspect-video flex flex-col items-center justify-center">
                                <p className="text-xl mb-2 font-semibold text-white">No image found</p>
                                <p>Could not load image for {viewingMove.name}</p>
                            </div>
                        )}
                        <h3 className="mt-4 text-xl font-bold text-white uppercase tracking-wider">{viewingMove.name}</h3>
                    </div>
                </div>
            )}
        </div>
    );
}

function ExerciseItem({ exercise, planId, onViewImage, onLogComplete }: { exercise: any, planId: string, onViewImage: () => void, onLogComplete: (res: any) => void }) {
    const { logSet, deleteGymExercise } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [weight, setWeight] = useState(exercise.lastWeight || 0);
    const [reps, setReps] = useState(exercise.targetReps || 0);
    const [feeling, setFeeling] = useState('');
    const [isDone, setIsDone] = useState(false);
    const [xpGained, setXpGained] = useState<number | null>(null);

    const handleDone = async () => {
        const res = await logSet(planId, exercise.id, Number(weight), Number(reps), feeling);
        setIsDone(true);
        setIsExpanded(false);
        if (res && res.success) {
            setXpGained(res.xpGained);
            if (onLogComplete) onLogComplete(res);
        }
    };

    return (
        <div className="transition-colors hover:bg-zinc-800/30">
            <div onClick={() => setIsExpanded(!isExpanded)} className="flex cursor-pointer items-center justify-between p-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className={cn("font-medium transition-colors", isDone ? "text-green-400 line-through" : "text-zinc-200")}>{exercise.name}</h3>
                        {isDone && <span className="text-xs text-green-500 font-bold">DONE</span>}
                        {xpGained !== null && <span className="text-xs text-yellow-400 font-bold ml-2 animate-in zoom-in">+{xpGained} XP</span>}
                    </div>
                    <p className="text-sm text-zinc-500">Goal: {exercise.targetSets}x{exercise.targetReps} • Last: {exercise.lastWeight}kg</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); onViewImage(); }} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700">Image</button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this exercise?')) deleteGymExercise(planId, exercise.id); }} className="text-zinc-600 hover:text-rose-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    <ChevronRight className={cn("h-5 w-5 text-zinc-600 transition-transform", isExpanded && "rotate-90")} />
                </div>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <div className="bg-zinc-950/50 rounded-lg p-3 space-y-3 border border-zinc-800/50">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Weight (kg)</label>
                                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-600" />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Reps</label>
                                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-600" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">Feeling Check (RPE/Notes)</label>
                            <input type="text" placeholder="e.g. Easy, Hard, 8/10..." value={feeling} onChange={(e) => setFeeling(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-600" />
                        </div>
                        <button onClick={handleDone} className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-zinc-200 transition-colors">Mark as Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlanSelector({ currentPlanId, plans, onSelect, trigger }: { currentPlanId: string | null, plans: any[], onSelect: (id: string | null) => void, trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger || (
                    <button className="p-1 text-zinc-500 hover:text-white rounded bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-60 overflow-y-auto">
                            <button
                                onClick={() => { onSelect(null); setIsOpen(false); }}
                                className={cn("w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors", !currentPlanId ? "text-cyan-400 font-bold" : "text-zinc-400")}
                            >
                                Rest Day / Clear
                            </button>
                            <div className="h-px bg-zinc-800 my-1" />
                            {plans.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { onSelect(p.id); setIsOpen(false); }}
                                    className={cn("w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors", currentPlanId === p.id ? "text-cyan-400 font-bold" : "text-zinc-300")}
                                >
                                    {p.dayName}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
