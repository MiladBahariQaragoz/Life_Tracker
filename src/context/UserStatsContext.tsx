import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type UserStats = {
    xp: number;
    level: number;
    nextLevelXp: number;
};

type UserStatsContextType = {
    stats: UserStats;
    addXp: (amount: number, source: string) => void;
    history: { id: string; source: string; amount: number; timestamp: number }[];
};

const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export function UserStatsProvider({ children }: { children: ReactNode }) {
    const [stats, setStats] = useState<UserStats>(() => {
        const saved = localStorage.getItem('life-tracker-stats');
        return saved ? JSON.parse(saved) : { xp: 0, level: 1, nextLevelXp: 100 };
    });

    const [history, setHistory] = useState<{ id: string; source: string; amount: number; timestamp: number }[]>(() => {
        const saved = localStorage.getItem('life-tracker-stats-history');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('life-tracker-stats', JSON.stringify(stats));
    }, [stats]);

    useEffect(() => {
        localStorage.setItem('life-tracker-stats-history', JSON.stringify(history));
    }, [history]);

    // SIMPLIFIED: XP System Disabled by User Request
    const addXp = (amount: number, source: string) => {
        // Safe implementation: just log it
        console.log(`XP Adjust (Disabled): +${amount} from ${source}`);

        // Optional: Keep basic counter working if needed, but remove complex math
        setStats(prev => ({
            ...prev,
            xp: prev.xp + amount
        }));

        setHistory(prev => [
            { id: crypto.randomUUID(), source, amount, timestamp: Date.now() },
            ...prev
        ].slice(0, 50));
    };

    return (
        <UserStatsContext.Provider value={{ stats, addXp, history }}>
            {children}
        </UserStatsContext.Provider>
    );
}

export function useUserStats() {
    const context = useContext(UserStatsContext);
    if (context === undefined) {
        throw new Error('useUserStats must be used within a UserStatsProvider');
    }
    return context;
}
