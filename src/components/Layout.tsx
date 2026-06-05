import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, BookOpen, CheckSquare } from 'lucide-react';
import { cn } from '../lib/utils';
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

    const currentLevelBaseXp = 100 * Math.pow(stats.level - 1, 2);
    const nextLevelTotalXp = 100 * Math.pow(stats.level, 2);
    const levelRange = nextLevelTotalXp - currentLevelBaseXp;
    const currentProgressXp = stats.xp - currentLevelBaseXp;
    const progressPercent = Math.min(100, Math.max(0, (currentProgressXp / levelRange) * 100));

    return (
        <div className="flex h-screen w-full flex-col md:flex-row bg-zinc-950 text-zinc-200 selection:bg-cyan-900 selection:text-white">
            <AiCoachModal />
            <SystemLog />

            <aside className="hidden w-20 flex-col items-center border-r-2 border-zinc-800 py-6 md:flex lg:w-72 lg:items-start bg-zinc-950 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10 relative">
                <div className="mb-12 w-full px-6">
                    <div className="font-display text-4xl font-bold tracking-tight text-white mb-2 uppercase flex flex-col gap-1">
                        <span className="lg:hidden">LT</span>
                        <span className="hidden lg:block leading-none tracking-tighter">LIFE</span>
                        <span className="hidden lg:block leading-none tracking-tighter text-zinc-500">TRACKER</span>
                    </div>

                    <div className="hidden lg:block w-full mt-8 border border-zinc-800 p-3 bg-zinc-900">
                        <div className="flex justify-between text-xs text-zinc-400 mb-2 font-mono uppercase tracking-widest">
                            <span>SYS.LVL // {stats.level}</span>
                            <span>{Math.floor(progressPercent)}%</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-950 overflow-hidden">
                            <div
                                className="h-full bg-zinc-200 transition-all duration-1000"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <nav className="flex w-full flex-col gap-1 px-4">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "group flex items-center gap-4 px-4 py-3 text-sm font-mono uppercase tracking-widest transition-all",
                                    isActive
                                        ? "bg-zinc-200 text-zinc-950 font-bold translate-x-2"
                                        : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
                                )
                            }
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="hidden lg:block">{item.label}</span>
                            {/* Accent block for active state */}
                            <div className="hidden lg:block ml-auto opacity-0 group-[.active]:opacity-100 group-hover:opacity-50 transition-opacity">
                                █
                            </div>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 relative">
                {/* Minimalist grid background overlay */}
                <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTEgMWgyMHYyMEgxem0xIDFoMTh2MThIMnoiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4xNSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-20 mix-blend-overlay"></div>
                <div className="relative p-4 md:p-12 pb-20 md:pb-12 max-w-5xl mx-auto z-10">
                    <Outlet />
                </div>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t-2 border-zinc-800 bg-zinc-950 md:hidden z-20">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center gap-1 p-2 text-[10px] font-mono uppercase tracking-widest transition-colors",
                                isActive ? "text-white font-bold" : "text-zinc-500"
                            )
                        }
                    >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}