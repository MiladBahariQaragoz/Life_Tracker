import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, BookOpen, CheckSquare } from 'lucide-react';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/gym', label: 'Gym', icon: Dumbbell },
    { path: '/study', label: 'Study', icon: BookOpen },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
];

export function Layout() {
    return (
        <div className="flex h-screen w-full flex-col md:flex-row bg-zinc-950 text-zinc-200">
            {/* Sidebar (Desktop) */}
            <aside className="hidden w-20 flex-col items-center border-r border-zinc-800 py-6 md:flex lg:w-64 lg:items-start lg:px-6">
                <div className="mb-8 text-xl font-bold tracking-tight text-white lg:text-2xl">
                    <span className="lg:hidden">LT</span>
                    <span className="hidden lg:block">LifeTracker</span>
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
