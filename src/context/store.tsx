import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    MOCK_GYM_DATA,
    MOCK_EXAMS,
    MOCK_TASKS,
    MOCK_GYM_MOVES,
    type GymPlan,
    type Exam,
    type Task
} from '../data/mock';
import { api } from '../lib/api';

type StoreContextType = {
    gymPlans: GymPlan[];
    exams: Exam[];
    tasks: Task[];
    gymMoves: { pageIndex: number; name: string; group: string; imageUrl?: string; }[];
    loading: boolean;
    toggleTask: (id: string) => void;
    logSet: (planId: string, exerciseId: string, weight: number, reps: number, feeling: string) => void;
    logStudySession: (examId: string, topicId: string, quality: 'light' | 'normal' | 'deep') => void;
    // New Actions
    addGymPlan: (dayName: string) => void;
    addExerciseToPlan: (planId: string, moveName: string) => void;
    deleteGymPlan: (id: string) => void;
    addExam: (name: string, date: string) => void;
    deleteExam: (id: string) => void;
    addTopic: (examId: string, name: string, goal: number) => void;
    deleteTopic: (id: string) => void;
    addTask: (title: string, priority: 'low' | 'medium' | 'high', dueDate?: string) => void;
    deleteTask: (id: string) => void;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [gymPlans, setGymPlans] = useState<GymPlan[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [gymMoves, setGymMoves] = useState<{ pageIndex: number; name: string; group: string; imageUrl?: string; }[]>([]);
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
            }
            setLoading(false);
        });
    }, []);

    const toggleTask = (id: string) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (!task) return prev;
            const updated = { ...task, completed: !task.completed };
            api.updateTask(updated);
            return prev.map(t => t.id === id ? updated : t);
        });
    };

    const addTask = (title: string, priority: 'low' | 'medium' | 'high', dueDate?: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            priority,
            completed: false,
            isMinimum: false,
            dueDate
        };
        setTasks(prev => [...prev, newTask]);
        api.createTask(newTask);
    };

    const deleteTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        api.deleteTask(id);
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


    const logSet = (planId: string, exerciseId: string, weight: number, reps: number, feeling: string) => {
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
        api.logSet(planId, exerciseId, weight, reps, feeling);
    };

    const logStudySession = (examId: string, topicId: string, quality: 'light' | 'normal' | 'deep') => {
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
        api.logStudySession(examId, topicId, quality);
    };

    return (
        <StoreContext.Provider value={{
            gymPlans, exams, tasks, loading,
            toggleTask, logSet, logStudySession,
            addGymPlan, deleteGymPlan, addExerciseToPlan,
            addExam, deleteExam, addTopic, deleteTopic,
            addTask, deleteTask,
            gymMoves
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
