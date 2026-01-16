import { useState } from 'react';
import { useStore } from '../context/store';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react';

import { cn } from '../lib/utils';


export function GymPage() {
    const { gymPlans, addGymPlan, deleteGymPlan, gymMoves, addExerciseToPlan } = useStore();

    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    // Add Move State
    const [addingToPlanId, setAddingToPlanId] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string>('All');

    // Image Viewer State
    const [viewingMove, setViewingMove] = useState<{ name: string, imageUrl?: string } | null>(null);

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

    // Group moves
    const groups = Array.from(new Set(gymMoves.map(m => m.group).filter(g => g && g.trim() !== ''))).sort();
    const filteredMoves = selectedGroup === 'All'
        ? gymMoves
        : gymMoves.filter(m => m.group === selectedGroup);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Gym Plan</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddingPlan(!isAddingPlan)}
                        className="rounded-full bg-white p-2 text-zinc-950 hover:bg-zinc-200 transition-colors"
                    >
                        <Plus className={cn("h-6 w-6 transition-transform", isAddingPlan && "rotate-45")} />
                    </button>
                </div>
            </div>

            {isAddingPlan && (
                <form onSubmit={handleAddReport} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-2 animate-in fade-in">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Day Name (e.g. Legs A)"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                    />
                    <button
                        type="submit"
                        disabled={!newPlanName}
                        className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 disabled:opacity-50"
                    >
                        Add
                    </button>
                </form>
            )}

            <div className="space-y-4">
                {gymPlans.map((plan) => (
                    <div key={plan.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 group/plan">
                        {/* Header */}
                        <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-white">{plan.dayName}</h2>
                                <p className="text-sm text-zinc-500">{plan.exercises.length} Exercises</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingToPlanId(plan.id);
                                    }}
                                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this plan?')) deleteGymPlan(plan.id);
                                    }}
                                    className="opacity-0 group-hover/plan:opacity-100 p-2 text-zinc-600 hover:text-rose-500 transition-opacity"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Exercise List */}
                        <div className="divide-y divide-zinc-800/50">
                            {plan.exercises.map((exercise) => (
                                <ExerciseItem
                                    key={exercise.id}
                                    exercise={exercise}
                                    planId={plan.id}
                                    onViewImage={() => handleExerciseClick(exercise.name)}
                                />
                            ))}
                            {plan.exercises.length === 0 && (
                                <div className="p-4 text-center text-sm text-zinc-600 italic">
                                    No exercises yet. Add one!
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Exercise Modal */}
            {addingToPlanId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 flex-none">
                            <h3 className="font-semibold text-white">Add Exercise</h3>
                            <button onClick={() => setAddingToPlanId(null)} className="text-zinc-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Group Filter */}
                        <div className="p-2 border-b border-zinc-800 flex gap-2 overflow-x-auto no-scrollbar flex-none">
                            <button
                                onClick={() => setSelectedGroup('All')}
                                className={cn(
                                    "px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors shrink-0",
                                    selectedGroup === 'All' ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                                )}
                            >
                                All
                            </button>
                            {groups.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setSelectedGroup(g)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors shrink-0",
                                        selectedGroup === g ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                                    )}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredMoves.map(move => (
                                <button
                                    key={move.name}
                                    onClick={() => handleAddMove(move.name)}
                                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                                >
                                    {move.name}
                                </button>
                            ))}
                            {filteredMoves.length === 0 && (
                                <div className="p-4 text-center text-zinc-500 text-sm">
                                    No moves found in this group.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Image Viewer */}
            {viewingMove && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
                    onClick={() => setViewingMove(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-screen w-full flex flex-col items-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setViewingMove(null)}
                            className="absolute -top-12 right-0 md:top-0 md:-right-12 p-2 text-white hover:text-zinc-300 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        {viewingMove.imageUrl ? (
                            <img
                                src={viewingMove.imageUrl}
                                alt={viewingMove.name}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-zinc-900"
                            />
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

function ExerciseItem({ exercise, planId, onViewImage }: { exercise: any, planId: string, onViewImage: () => void }) {
    const { logSet } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [weight, setWeight] = useState(exercise.lastWeight || 0);
    const [reps, setReps] = useState(exercise.targetReps || 0);
    const [feeling, setFeeling] = useState('');
    const [isDone, setIsDone] = useState(false);

    const handleDone = () => {
        logSet(planId, exercise.id, Number(weight), Number(reps), feeling);
        setIsDone(true);
        setIsExpanded(false);
    };

    return (
        <div className="transition-colors hover:bg-zinc-800/30">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex cursor-pointer items-center justify-between p-4"
            >
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className={cn("font-medium transition-colors", isDone ? "text-green-400 line-through" : "text-zinc-200")}>
                            {exercise.name}
                        </h3>
                        {isDone && <span className="text-xs text-green-500 font-bold">DONE</span>}
                    </div>

                    <p className="text-sm text-zinc-500">
                        Goal: {exercise.targetSets}x{exercise.targetReps} • Last: {exercise.lastWeight}kg
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewImage();
                        }}
                        className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700"
                    >
                        Image
                    </button>
                    <ChevronRight className={cn("h-5 w-5 text-zinc-600 transition-transform", isExpanded && "rotate-90")} />
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <div className="bg-zinc-950/50 rounded-lg p-3 space-y-3 border border-zinc-800/50">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Reps</label>
                                <input
                                    type="number"
                                    value={reps}
                                    onChange={(e) => setReps(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-600"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">Feeling Check (RPE/Notes)</label>
                            <input
                                type="text"
                                placeholder="e.g. Easy, Hard, 8/10..."
                                value={feeling}
                                onChange={(e) => setFeeling(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                        <button
                            onClick={handleDone}
                            className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            Mark as Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
