import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { format, subDays, addDays } from 'date-fns';

type ActivityData = {
    date: string;
    count: number;
};

type Props = {
    data: ActivityData[];
};

export function ProductivityHeatmap({ data }: Props) {
    // Generate last 365 days
    const calendarData = useMemo(() => {
        const today = new Date();
        const days = [];
        const endDate = today;
        const startDate = subDays(today, 364); // approx 1 year

        // Normalize data map
        const dataMap = new Map();
        data.forEach(d => dataMap.set(d.date, d.count));

        let current = startDate;
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            days.push({
                date: current,
                count: dataMap.get(dateStr) || 0
            });
            current = addDays(current, 1);
        }
        return days;
    }, [data]);

    // Group by weeks for grid layout if needed, or just flex wrap
    // GitHub style is columns = weeks, rows = days (Mon-Sun)
    // We can use CSS Grid: grid-rows-7 grid-flow-col

    const getColor = (count: number) => {
        if (count === 0) return 'bg-zinc-900';
        if (count < 30) return 'bg-emerald-900/40';
        if (count < 60) return 'bg-emerald-700/60';
        if (count < 120) return 'bg-emerald-500/80';
        return 'bg-emerald-400';
    };

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Productivity Heatmap</h3>
            <div className="w-full overflow-x-auto">
                <div
                    className="grid grid-rows-7 gap-1 w-max"
                    style={{ gridAutoFlow: 'column' }}
                >
                    {calendarData.map((day, i) => (
                        <div
                            key={i}
                            title={`${format(day.date, 'MMM do')}: ${day.count} mins`}
                            className={cn(
                                "h-3 w-3 rounded-sm transition-colors hover:ring-1 hover:ring-white/50",
                                getColor(day.count)
                            )}
                        />
                    ))}
                </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 text-xs text-zinc-500">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="h-3 w-3 rounded-sm bg-zinc-900" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-900/40" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-700/60" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-500/80" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
