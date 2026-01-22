export type Exercise = {
    id: string;
    name: string;
    videoUrl?: string;
    lastWeight: number;
    lastReps: number;
    targetSets: number;
    targetReps: number;
};

export type GymPlan = {
    id: string;
    dayName: string;
    exercises: Exercise[];
};

export type ExamTopic = {
    id: string;
    name: string;
    sessionsCompleted: number;
    totalSessionsGoal: number;
};

export type Exam = {
    id: string;
    name: string;
    date: string;
    topics: ExamTopic[];
};

export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
    id: string;
    title: string;
    priority: TaskPriority;
    importance: 'low' | 'medium' | 'high';
    completed: boolean;
    isMinimum: boolean;
    dueDate?: string;
};

export type GymMove = {
    pageIndex: number;
    name: string;
    group: string;
    imageUrl?: string;
};

export type XPBreakdownItem = {
    label: string;
    xp: number;
};

export type XPMultiplier = {
    name: string;
    value: number;
};

export type XPCaps = {
    softCapHit: boolean;
    hardCapHit: boolean;
};

export type XPResult = {
    totalXP: number;
    breakdown: XPBreakdownItem[];
    multipliersApplied: XPMultiplier[];
    capsApplied: XPCaps;
};

export type UserXP = {
    id: string;
    totalXP: number;
    level: number;
    currentXP?: number; // Calculated on frontend or backend
    neededXP?: number;
};
