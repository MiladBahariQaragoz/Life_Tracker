import { useEffect, useState } from 'react';
import { useStore } from '../context/store';
import { useUserStats } from '../context/UserStatsContext';
import { Brain, X, Zap } from 'lucide-react';

export function HolographicOverlay() {
    const { exams, tasks } = useStore();
    const { stats } = useUserStats();
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Simple logic: On load, check for "Danger"
        // Find exam with lowest days left or lowest progress
        const now = new Date();
        const upcomingExams = exams
            .map(e => ({ ...e, days: Math.ceil((new Date(e.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) }))
            .filter(e => e.days >= 0)
            .sort((a, b) => a.days - b.days);

        const urgentExam = upcomingExams[0];

        if (urgentExam) {
            setMessage(`ALERT: ${urgentExam.name} boss is approaching (${urgentExam.days} days). HP Levels detected.`);
            setIsVisible(true);
        } else if (tasks.length > 0) {
            setMessage(`Task Queue: ${tasks.length} pending operations.`);
            setIsVisible(true);
        } else {
            setMessage(`System Nominal. Level ${stats.level} Active.`);
            setIsVisible(true);
        }

        // Auto-hide after 10 seconds
        const timer = setTimeout(() => setIsVisible(false), 10000);
        return () => clearTimeout(timer);
    }, [exams, tasks, stats.level]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 w-80 pointer-events-none">
            <div className="relative overflow-hidden rounded-lg border border-cyan-500/50 bg-cyan-950/80 backdrop-blur-md p-4 shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-in slide-in-from-right duration-500 pointer-events-auto">
                {/* Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Brain className="h-5 w-5 animate-pulse" />
                            <span className="text-xs font-bold tracking-widest uppercase">AI Assistant</span>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-cyan-500 hover:text-cyan-300 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="font-mono text-sm text-cyan-100 leading-relaxed drop-shadow-[0_0_2px_rgba(6,182,212,0.8)]">
                        {message}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-cyan-800/50 pt-2">
                        <div className="flex items-center gap-1 text-xs text-cyan-400">
                            <Zap className="h-3 w-3" />
                            <span>LVL {stats.level}</span>
                        </div>
                        <div className="text-[10px] text-cyan-600 font-mono">
                            {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
