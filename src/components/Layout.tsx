import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, BookOpen, CheckSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { HolographicOverlay } from './HolographicOverlay';
import { useUserStats } from '../context/UserStatsContext';
import { AiCoachModal } from './AiCoachModal';
import { SystemLog } from './SystemLog';

const NAV_ITEMS = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/gym', label: 'Gym', icon: Dumbbell },
    { path: '/study', label: 'Study', icon: BookOpen },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
];

export function Layout() {
    const { stats } = useUserStats();

    // Level Progress
    // We didn't save "progress to next level" in stats directly as a percentage, but we have nextLevelXp (total XP needed for next level). 
    // Wait, nextLevelXp in my context definition was "XP needed for NEXT level".
    // Current Level L starts at 100 * (L-1)^2. Next starts at 100 * L^2.
    // Range is 100 * L^2 - 100 * (L-1)^2.
    // Progress = (XP - StartXP) / (NextXP - StartXP).

    const currentLevelBaseXp = 100 * Math.pow(stats.level - 1, 2);
    const nextLevelTotalXp = 100 * Math.pow(stats.level, 2);
    const levelRange = nextLevelTotalXp - currentLevelBaseXp;
    const currentProgressXp = stats.xp - currentLevelBaseXp;
    const progressPercent = Math.min(100, Math.max(0, (currentProgressXp / levelRange) * 100));

    return (
        <div className="flex h-screen w-full flex-col md:flex-row bg-zinc-950 text-zinc-200">
            <HolographicOverlay />
            <AiCoachModal />
            <SystemLog />

            {/* Sidebar (Desktop) */}
            <aside className="hidden w-20 flex-col items-center border-r border-zinc-800 py-6 md:flex lg:w-64 lg:items-start lg:px-6">
                <div className="mb-8 w-full">
                    <div className="text-xl font-bold tracking-tight text-white lg:text-2xl mb-2 flex items-center gap-2">
                        <span className="lg:hidden">LT</span>
                        <span className="hidden lg:block">LifeTracker</span>
                    </div>

                    {/* Level Bar */}
                    <div className="hidden lg:block w-full">
                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>Lvl {stats.level}</span>
                            <span>{Math.floor(progressPercent)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <nav className="flex w-full flex-col gap-2">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-zinc-800 text-white"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                                )
                            }
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="hidden lg:block">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
                <div className="mx-auto max-w-3xl">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Nav (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-zinc-800 bg-zinc-950/90 backdrop-blur md:hidden">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center gap-1 p-2 text-xs font-medium transition-colors",
                                isActive ? "text-white" : "text-zinc-500"
                            )
                        }
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
