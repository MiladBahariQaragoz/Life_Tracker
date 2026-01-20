import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/store';
import { useUserStats } from '../context/UserStatsContext';
import { ArrowLeft, Skull, Sword, X, Trash2 } from 'lucide-react';
import XPBreakdown from '../components/XPBreakdown';
import type { XPResult } from '../types';
import { cn } from '../lib/utils';

export function ExamDetailPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { exams, logStudySession, deleteTopic } = useStore();
    const { addXp } = useUserStats();

    const exam = exams.find(e => e.id === examId);

    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [environment, setEnvironment] = useState('Home');
    const [interruptions, setInterruptions] = useState('');
    const [preSessionActivity, setPreSessionActivity] = useState('');

    const [lastXPResult, setLastXPResult] = useState<XPResult | null>(null);

    if (!exam) return <div>Exam not found</div>;

    const handleSession = async (topicId: string, quality: 'light' | 'normal' | 'deep') => {
        const res = await logStudySession(
            exam.id,
            topicId,
            quality,
            environment,
            interruptions ? Number(interruptions) : 0,
            preSessionActivity
        );

        if (res && res.success) {
            addXp(res.xpGained, `Study: ${exam.topics.find(t => t.id === topicId)?.name}`);
            if (res.breakdown) {
                setLastXPResult({
                    totalXP: res.xpGained,
                    breakdown: res.breakdown,
                    multipliersApplied: res.multipliers || [],
                    capsApplied: res.caps || { softCapHit: false, hardCapHit: false }
                });
            }
        }

        // Reset and Close
        setActiveTopic(null);
        setEnvironment('Home');
        setInterruptions('');
        setPreSessionActivity('');
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 relative">

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

            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/study')}
                    className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">{exam.name}</h1>
                    <p className="text-sm text-zinc-500">Breakdown by Topic</p>
                </div>
            </div>

            {/* Boss Battle Interface */}
            <BossBattleCard exam={exam} />

            {/* Topics List */}
            <div className="space-y-3">
                {exam.topics.map(topic => {
                    const progress = Math.min(100, Math.round((topic.sessionsCompleted / topic.totalSessionsInitial) * 100));
                    const isExpanded = activeTopic === topic.id;

                    return (
                        <div key={topic.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all">
                            <div
                                onClick={() => setActiveTopic(isExpanded ? null : topic.id)}
                                className="flex cursor-pointer items-center justify-between p-4 hover:bg-zinc-800/50"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-zinc-200">{topic.name}</h3>
                                        <span className="text-xs text-zinc-500">{topic.sessionsCompleted}/{topic.totalSessionsInitial}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                                        <div
                                            className={cn("h-full transition-all duration-500", progress >= 100 ? "bg-emerald-500" : "bg-blue-600/70")}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this topic?')) deleteTopic(topic.id);
                                    }}
                                    className="p-2 text-zinc-600 hover:text-rose-500 transition-colors z-10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Quick Log Action (Expanded) */}
                            {
                                isExpanded && (
                                    <div className="border-t border-zinc-800 bg-black/20 p-4 animate-in slide-in-from-top-2 space-y-4">

                                        <div className="grid grid-cols-2 gap-3">
                                            <select
                                                className="bg-zinc-800 border-zinc-700 text-sm rounded-lg p-2 text-white"
                                                onChange={(e) => setEnvironment(e.target.value)}
                                                value={environment}
                                            >
                                                <option value="Home">Home</option>
                                                <option value="Library">Library</option>
                                                <option value="Cafe">Cafe</option>
                                                <option value="Campus">Campus</option>
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Interruptions"
                                                className="bg-zinc-800 border-zinc-700 text-sm rounded-lg p-2 text-white placeholder:text-zinc-500"
                                                value={interruptions}
                                                onChange={(e) => setInterruptions(e.target.value)}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Pre-session Activity (e.g. Meditated, Slept)"
                                            className="w-full bg-zinc-800 border-zinc-700 text-sm rounded-lg p-2 text-white placeholder:text-zinc-500"
                                            value={preSessionActivity}
                                            onChange={(e) => setPreSessionActivity(e.target.value)}
                                        />

                                        <div>
                                            <p className="mb-2 text-sm font-medium text-zinc-400">Log Session Quality:</p>
                                            <div className="flex gap-2">
                                                {['light', 'normal', 'deep'].map((q) => (
                                                    <button
                                                        key={q}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSession(topic.id, q as any);
                                                        }}
                                                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-sm font-medium text-zinc-300 hover:border-blue-500 hover:bg-zinc-700 hover:text-white active:scale-95 transition-all capitalize"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    );
                })}
            </div>
        </div >
    );
}

function BossBattleCard({ exam }: { exam: any }) {
    const totalSessions = exam.topics.reduce((acc: number, t: any) => acc + t.totalSessionsInitial, 0);
    const completedSessions = exam.topics.reduce((acc: number, t: any) => acc + t.sessionsCompleted, 0);
    const hp = Math.max(0, totalSessions - completedSessions);
    const maxHp = totalSessions;
    const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;

    return (
        <div className="relative overflow-hidden rounded-xl border border-red-900/50 bg-black/60 p-6 shadow-2xl">
            {/* Background Glitch Effect */}
            <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between text-red-500">
                    <div className="flex items-center gap-2">
                        <Skull className="h-6 w-6 animate-pulse" />
                        <span className="font-mono text-lg font-bold tracking-widest uppercase">BOSS DETECTED</span>
                    </div>
                    <span className="font-mono text-xl font-bold">{hp} HP</span>
                </div>

                {/* HP Bar */}
                <div className="relative h-6 w-full overflow-hidden rounded bg-red-900/30 border border-red-900/50">
                    <div
                        className="h-full bg-red-600 transition-all duration-1000 ease-out relative"
                        style={{ width: `${hpPercent}%` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-zinc-500 text-xs font-mono">
                        TARGET: {exam.name.toUpperCase()}
                    </p>
                    <div className="flex items-center gap-1 text-red-400 text-xs font-mono">
                        <Sword className="h-3 w-3" />
                        <span>DEAL DAMAGE BY STUDYING</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
