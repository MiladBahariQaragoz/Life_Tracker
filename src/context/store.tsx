import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    type GymPlan,
    type Exam,
    type Task,
    type GymMove
} from '../types';
import { api } from '../lib/api';

type StoreContextType = {
    gymPlans: GymPlan[];
    exams: Exam[];
    tasks: Task[];
    gymMoves: GymMove[];
    loading: boolean;
    toggleTask: (id: string) => Promise<any>;
    logSet: (planId: string, exerciseId: string, weight: number, reps: number, feeling?: string, rpe?: number, restInterval?: number) => Promise<any>;
    logStudySession: (examId: string, topicId: string, quality: 'light' | 'normal' | 'deep', environment?: string, interruptions?: number, preSessionActivity?: string) => Promise<any>;
    // New Actions
    addGymPlan: (dayName: string) => string;
    addExerciseToPlan: (planId: string, moveName: string) => void;
    deleteGymPlan: (id: string) => void;
    deleteGymExercise: (planId: string, exerciseId: string) => void;
    addExam: (name: string, date: string) => string;
    deleteExam: (id: string) => void;
    addTopic: (examId: string, name: string, goal: number) => void;
    deleteTopic: (id: string) => void;
    addTask: (title: string, priority: 'low' | 'medium' | 'high', dueDate?: string, importance?: 'low' | 'medium' | 'high') => Promise<any>;
    deleteTask: (id: string) => Promise<any>;
    // AI
    askAiCoach: (mode: 'quick' | 'plan', userMessage?: string) => Promise<string>;
    generateAiGymPlan: (preferences?: any) => Promise<any>;
    // Weekly Schedule
    generateWeeklySchedule: (daysPerWeek: number, startDate: string) => Promise<any>;
    updateScheduleItem: (date: string, planId: string | null) => Promise<any>;
    completeScheduleItem: (id: string, isDone: boolean) => Promise<any>;
    weeklySchedule: any[];
    refreshSchedule: () => void;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [gymPlans, setGymPlans] = useState<GymPlan[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [gymMoves, setGymMoves] = useState<GymMove[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        api.getInitData().then(data => {
            if (data) {
                setGymPlans(data.gymPlans);
                setExams(data.exams);
                setTasks(data.tasks);
                setGymMoves((data.gymMoves || []).map(move => ({
                    ...move,
                    imageUrl: `/gym_moves/ExerciseBook_page-${String(move.pageIndex).padStart(4, '0')}.jpg`
                })));

                // Fetch Schedule
                api.getWeeklySchedule().then(s => setWeeklySchedule(s));
            }
            setLoading(false);
        });
    }, []);

    const refreshSchedule = () => {
        api.getWeeklySchedule().then(s => setWeeklySchedule(s));
    };

    const toggleTask = async (id: string) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (!task) return prev;
            const updated = { ...task, completed: !task.completed };
            // We can't await inside setState, so we call api outside?
            // Actually, we can just find task before setState.
            return prev.map(t => t.id === id ? updated : t);
        });

        // We need the updated status to send to API.
        // Let's refactor to find task first.
        const task = tasks.find(t => t.id === id);
        if (task) {
            const updated = { ...task, completed: !task.completed };
            return await api.updateTask(updated);
        }
    };

    const addTask = async (title: string, priority: 'low' | 'medium' | 'high', dueDate?: string, importance: 'low' | 'medium' | 'high' = 'medium') => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            priority,
            importance,
            completed: false,
            isMinimum: false,
            dueDate
        };
        setTasks(prev => [...prev, newTask]);
        return await api.createTask(newTask);
    };

    const deleteTask = async (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        return await api.deleteTask(id);
    };

    // GYM ACTIONS
    const addGymPlan = (dayName: string) => {
        const newPlan: GymPlan = {
            id: crypto.randomUUID(),
            dayName,
            exercises: []
        };
        setGymPlans(prev => [...prev, newPlan]);
        api.createGymPlan(newPlan.id, dayName);
        return newPlan.id;
    };

    const addExerciseToPlan = (planId: string, moveName: string) => {
        // Optimistic update - create a temp exercise entry
        const tempId = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        setGymPlans(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                exercises: [...p.exercises, {
                    id: tempId,
                    name: moveName,
                    targetSets: 3,
                    targetReps: 10,
                    lastWeight: 0,
                    lastReps: 0
                }]
            };
        }));
        api.addExerciseToPlan(planId, moveName);
    };

    const deleteGymPlan = (id: string) => {
        setGymPlans(prev => prev.filter(p => p.id !== id));
        api.deleteGymPlan(id);
    };

    const deleteGymExercise = (planId: string, exerciseId: string) => {
        setGymPlans(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                exercises: p.exercises.filter(ex => ex.id !== exerciseId)
            };
        }));
        api.deleteGymExercise(exerciseId);
    };

    // STUDY ACTIONS
    const addExam = (name: string, date: string) => {
        const newExam: Exam = {
            id: crypto.randomUUID(),
            name,
            date,
            topics: []
        };
        setExams(prev => [...prev, newExam]);
        api.createExam(newExam.id, name, date);
        return newExam.id;
    };

    const deleteExam = (id: string) => {
        setExams(prev => prev.filter(e => e.id !== id));
        api.deleteExam(id);
    };

    const addTopic = (examId: string, name: string, goal: number) => {
        const newTopic = {
            id: crypto.randomUUID(),
            name,
            totalSessionsInitial: goal,
            sessionsCompleted: 0
        };
        setExams(prev => prev.map(e => {
            if (e.id !== examId) return e;
            return { ...e, topics: [...e.topics, newTopic] };
        }));
        api.createTopic(newTopic.id, examId, name, goal);
    };

    const deleteTopic = (topicId: string) => {
        setExams(prev => prev.map(e => ({
            ...e,
            topics: e.topics.filter(t => t.id !== topicId)
        })));
        api.deleteTopic(topicId);
    };


    const logSet = async (planId: string, exerciseId: string, weight: number, reps: number, feeling: string = 'normal', rpe?: number, restInterval?: number) => {
        // Optimistic Update
        setGymPlans(prev => prev.map(plan => {
            if (plan.id !== planId) return plan;
            return {
                ...plan,
                exercises: plan.exercises.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    return { ...ex, lastWeight: weight, lastReps: reps };
                })
            };
        }));

        // API Call
        return await api.logSet(planId, exerciseId, weight, reps, feeling, rpe, restInterval);
    };

    const logStudySession = async (examId: string, topicId: string, quality: 'light' | 'normal' | 'deep', environment?: string, interruptions?: number, preSessionActivity?: string) => {
        console.log(`Logged session for ${topicId} with quality: ${quality}`);

        // Optimistic Update
        setExams(prev => prev.map(exam => {
            if (exam.id !== examId) return exam;
            return {
                ...exam,
                topics: exam.topics.map(t => {
                    if (t.id !== topicId) return t;
                    return { ...t, sessionsCompleted: t.sessionsCompleted + 1 };
                })
            };
        }));

        // API Call
        return await api.logStudySession(examId, topicId, quality, environment, interruptions, preSessionActivity);
    };

    // AI ACTIONS
    const askAiCoach = async (mode: 'quick' | 'plan', userMessage?: string) => {
        const mood = sessionStorage.getItem('userMood') || 'unknown';
        const context = {
            mood,
            exams: exams,
            tasks: tasks.filter(t => !t.completed),
            gym: gymPlans // Maybe specific recent history would be better, but plans are context too
        };
        const res = await api.askAiCoach(context, mode, userMessage);
        return res && res.answer ? res.answer : "I couldn't reach the coach right now.";
    };

    const generateAiGymPlan = async (preferences?: any) => {
        // We need history. Ideally fetch from backend or derive from local 'gymPlans' if they have history. 
        // But gymPlans is structure. Stats are in 'exercises'. 
        // For simple MVP we pass the current plan structure as 'history'.
        // Better: Fetch real history. But let's pass plans.
        const res = await api.generateAiGymPlan(gymPlans, preferences);
        return res;
    };

    const generateWeeklySchedule = async (daysPerWeek: number, startDate: string) => {
        const res = await api.generateWeeklySchedule(daysPerWeek, startDate);
        refreshSchedule();
        return res;
    };

    const updateScheduleItem = async (date: string, planId: string | null) => {
        // Optimistic update difficult without ID, but we can refresh or mock
        // Let's just optimistic update by finding matching date
        setWeeklySchedule(prev => {
            const existing = prev.find(i => i.date === date);
            if (!planId) {
                return prev.filter(i => i.date !== date);
            }
            if (existing) {
                return prev.map(i => i.date === date ? { ...i, planId, isDone: 0 } : i);
            }
            return [...prev, { id: 'temp-' + Date.now(), date, planId, isDone: 0 }];
        });

        const res = await api.updateWeeklySchedule(date, planId);
        if (res.success) refreshSchedule(); // Fetch real IDs
        return res;
    };

    const completeScheduleItem = async (id: string, isDone: boolean) => {
        setWeeklySchedule(prev => prev.map(item => item.id === id ? { ...item, isDone: isDone ? 1 : 0 } : item));
        return await api.completeScheduleItem(id, isDone);
    };

    return (
        <StoreContext.Provider value={{
            gymPlans, exams, tasks, loading,
            toggleTask, logSet, logStudySession,
            addGymPlan, deleteGymPlan, addExerciseToPlan, deleteGymExercise,
            addExam, deleteExam, addTopic, deleteTopic,
            addTask, deleteTask,
            gymMoves,
            askAiCoach, generateAiGymPlan,
            weeklySchedule, generateWeeklySchedule, updateScheduleItem, completeScheduleItem, refreshSchedule
        }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
}
