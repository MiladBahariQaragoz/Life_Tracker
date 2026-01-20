import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/store';
import { ArrowLeft, Check, History, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export function ExerciseDetailPage() {
    const { planId, exerciseId } = useParams();
    const navigate = useNavigate();
    const { gymPlans, logSet } = useStore();

    const plan = gymPlans.find(p => p.id === planId);
    const exercise = plan?.exercises.find(e => e.id === exerciseId);

    const [weight, setWeight] = useState<string>('');
    const [reps, setReps] = useState<string>('');
    const [rpe, setRpe] = useState<string>('');
    const [rest, setRest] = useState<string>('');
    const [isLogged, setIsLogged] = useState(false);

    // Auto-fill with last stats
    useEffect(() => {
        if (exercise) {
            setWeight(exercise.lastWeight.toString());
            setReps(exercise.lastReps.toString());
        }
    }, [exercise]);

    if (!exercise || !plan) return <div>Exercise not found</div>;

    const handleLog = () => {
        if (!planId || !exerciseId) return;

        logSet(
            planId,
            exerciseId,
            Number(weight),
            Number(reps),
            'normal',
            rpe ? Number(rpe) : undefined,
            rest ? Number(rest) : undefined
        );
        setIsLogged(true);

        // Quick feedback reset or navigation? User rule: "Quick log set interaction"
        // Maybe stay to log another set? Or go back? 
        // Usually people log multiple sets. For simplicity here: Flash success.
        setTimeout(() => setIsLogged(false), 2000);
    };

    const progression = Number(weight) - exercise.lastWeight;

    return (
        <div className="flex h-[calc(100vh-80px)] flex-col md:h-auto animate-in slide-in-from-right-8 duration-300">

            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-white md:text-2xl">{exercise.name}</h1>
            </div>

            {/* Media Placeholder */}
            <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                    <Play className="h-12 w-12 opacity-50" />
                </div>
                <p className="absolute bottom-2 left-2 text-xs font-mono text-zinc-500">Video Placeholder</p>
            </div>

            {/* Stats & Inputs */}
            <div className="flex-1 space-y-6">

                {/* Previous Stats */}
                <div className="rounded-lg bg-zinc-900/50 p-4 border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400">
                        <History className="h-4 w-4" />
                        <span className="text-sm font-medium">Last Session</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{exercise.lastWeight}</span>
                        <span className="text-sm text-zinc-500">kg</span>
                        <span className="mx-2 text-zinc-700">•</span>
                        <span className="text-2xl font-bold text-white">{exercise.lastReps}</span>
                        <span className="text-sm text-zinc-500">reps</span>
                    </div>
                </div>

                {/* Input Area */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Weight (kg)</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-2xl font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Reps</label>
                        <input
                            type="number"
                            value={reps}
                            onChange={(e) => setReps(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-2xl font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">RPE (1-10)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={rpe}
                            onChange={(e) => setRpe(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-2xl font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Rest (s)</label>
                        <input
                            type="number"
                            value={rest}
                            placeholder="60"
                            onChange={(e) => setRest(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-2xl font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* Progression Indicator */}
                {progression !== 0 && !isNaN(progression) && (
                    <div className={cn(
                        "text-center text-sm font-medium",
                        progression > 0 ? "text-emerald-500" : "text-amber-500"
                    )}>
                        {progression > 0 ? '+' : ''}{progression}kg since last time
                    </div>
                )}

            </div>

            {/* Action Button */}
            <div className="mt-8">
                <button
                    onClick={handleLog}
                    className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold transition-all active:scale-95",
                        isLogged
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-zinc-950 hover:bg-zinc-200"
                    )}
                >
                    {isLogged ? (
                        <>
                            <Check className="h-6 w-6" />
                            Saved!
                        </>
                    ) : (
                        "Log Set"
                    )}
                </button>
            </div>

        </div>
    );
}
