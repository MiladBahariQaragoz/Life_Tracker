import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type VolumeData = {
    date: string;
    exercise: string;
    volume: number;
};

type Props = {
    data: VolumeData[];
};

export function VolumeProgression({ data }: Props) {
    // Process data to group by date for Recharts: { date, 'Bench Press': 1200, 'Squat': 1500 }
    const chartData = data.reduce((acc: any[], curr) => {
        let day = acc.find(d => d.date === curr.date);
        if (!day) {
            day = { date: curr.date };
            acc.push(day);
        }
        day[curr.exercise] = curr.volume;
        return acc;
    }, []);

    // Get unique exercises for Lines
    const exerciseNames = Array.from(new Set(data.map(d => d.exercise)));
    const colors = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa'];

    return (
        <div className="h-[400px] w-full rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Volume Progression</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                            dataKey="date"
                            stroke="#71717a"
                            fontSize={12}
                            tickFormatter={(val: string) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="#71717a" fontSize={12} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        {exerciseNames.map((name, i) => (
                            <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={colors[i % colors.length]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
