import { useState, useEffect } from 'react';
import { useStore } from '../context/store';
import { X, Sparkles, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

export function AiCoachModal() {
    const { askAiCoach } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'mood' | 'loading' | 'advice'>('mood');
    const [mood, setMood] = useState('');
    const [advice, setAdvice] = useState('');

    useEffect(() => {
        // Check if we've already asked today
        const lastAsk = sessionStorage.getItem('lastAiCheck');
        if (!lastAsk) {
            // Delay opening slightly for startup animation
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleMoodSubmit = async () => {
        if (!mood) return;

        sessionStorage.setItem('userMood', mood);
        setStep('loading');

        try {
            const result = await askAiCoach('quick', `I feel ${mood}`);
            setAdvice(result);
            setStep('advice');
            sessionStorage.setItem('lastAiCheck', Date.now().toString());
        } catch (e) {
            setAdvice("I'm having trouble connecting to your neural link right now.");
            setStep('advice');
        }
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden glass-panel">

                {/* Holographic Header */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70" />

                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 flex flex-col items-center text-center">

                    <div className="w-16 h-16 rounded-full bg-cyan-950/30 flex items-center justify-center mb-6 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                        <BrainCircuit className={cn(
                            "w-8 h-8 text-cyan-400",
                            step === 'loading' && "animate-pulse"
                        )} />
                    </div>

                    {step === 'mood' && (
                        <div className="space-y-6 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Systems Online</h2>
                                <p className="text-zinc-400">How are your cognitive and physical levels feeling currently?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {['Energized', 'Tired', 'Focused', 'Stressed', 'Motivated', 'Overwhelmed'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMood(m)}
                                        className={cn(
                                            "p-3 rounded-lg border text-sm font-medium transition-all duration-200",
                                            mood === m
                                                ? "bg-cyan-950/50 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                                : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 text-zinc-300"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleMoodSubmit}
                                disabled={!mood}
                                className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Initialize Protocol
                            </button>
                        </div>
                    )}

                    {step === 'loading' && (
                        <div className="py-12 space-y-4 animate-in fade-in duration-300">
                            <div className="flex gap-2 justify-center">
                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                            </div>
                            <p className="text-sm text-cyan-500 font-mono animate-pulse">ANALYZING BIOMETRICS & SCHEDULE...</p>
                        </div>
                    )}

                    {step === 'advice' && (
                        <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-cyan-400 mb-4">Directive Received</h2>
                                <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800 text-left">
                                    <p className="text-zinc-200 leading-relaxed font-medium">
                                        "{advice}"
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-transparent border border-zinc-700 text-zinc-300 font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                Acknowledge
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
