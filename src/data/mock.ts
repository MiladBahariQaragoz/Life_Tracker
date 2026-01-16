export type Exercise = {
    id: string;
    name: string;
    videoUrl?: string; // Optional for now
    lastWeight: number;
    lastReps: number;
    targetSets: number;
    targetReps: number;
};

export type GymPlan = {
    id: string;
    dayName: string; // "Monday", "Push", etc.
    exercises: Exercise[];
};

export type ExamTopic = {
    id: string;
    name: string;
    sessionsCompleted: number;
    totalSessionsInitial: number; // Rough estimate
};

export type Exam = {
    id: string;
    name: string;
    date: string; // ISO date
    topics: ExamTopic[];
};

export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
    id: string;
    title: string;
    priority: TaskPriority;
    completed: boolean;
    isMinimum: boolean; // "Today's minimum"
    dueDate?: string;
};

export const MOCK_GYM_DATA: GymPlan[] = [
    {
        id: 'push-1',
        dayName: 'Push A',
        exercises: [
            { id: 'bp', name: 'Bench Press', lastWeight: 80, lastReps: 8, targetSets: 3, targetReps: 8 },
            { id: 'ohp', name: 'Overhead Press', lastWeight: 50, lastReps: 10, targetSets: 3, targetReps: 10 },
            { id: 'lat-raise', name: 'Lateral Raises', lastWeight: 12, lastReps: 15, targetSets: 4, targetReps: 15 },
        ]
    },
    {
        id: 'pull-1',
        dayName: 'Pull A',
        exercises: [
            { id: 'dl', name: 'Deadlift', lastWeight: 140, lastReps: 5, targetSets: 3, targetReps: 5 },
            { id: 'row', name: 'Barbell Row', lastWeight: 70, lastReps: 10, targetSets: 3, targetReps: 10 },
        ]
    }
];

export const MOCK_GYM_MOVES = [
    { pageIndex: 5, name: 'Bench Press', group: 'Push' },
    { pageIndex: 6, name: 'Overhead Press', group: 'Push' },
    { pageIndex: 10, name: 'Deadlift', group: 'Pull' },
    { pageIndex: 12, name: 'Barbell Row', group: 'Pull' },
    { pageIndex: 15, name: 'Squat', group: 'Legs' },
];

export const MOCK_EXAMS: Exam[] = [
    {
        id: 'calc',
        name: 'Calculus II',
        date: '2026-03-15',
        topics: [
            { id: 't1', name: 'Integration Techniques', sessionsCompleted: 3, totalSessionsInitial: 8 },
            { id: 't2', name: 'Series & Sequences', sessionsCompleted: 0, totalSessionsInitial: 10 },
        ]
    },
    {
        id: 'physics',
        name: 'Physics I',
        date: '2026-03-20',
        topics: [
            { id: 'p1', name: 'Mechanics', sessionsCompleted: 5, totalSessionsInitial: 15 },
        ]
    }
];

export const MOCK_TASKS: Task[] = [
    { id: '1', title: 'Review lecture notes', priority: 'medium', completed: false, isMinimum: true },
    { id: '2', title: 'Buy groceries', priority: 'low', completed: false, isMinimum: false },
    { id: '3', title: 'Submit assignment', priority: 'high', completed: false, isMinimum: true },
];
