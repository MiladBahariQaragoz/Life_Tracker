import type { GymPlan, Exam, Task } from '../data/mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type InitData = {
    gymPlans: GymPlan[];
    exams: Exam[];
    tasks: Task[];
    gymMoves: { pageIndex: number; name: string; group: string; }[];
};

/**
 * Helper to send POST requests.
 */
async function post(route: string, data: any) {
    try {
        await fetch(`${API_URL}/api/${route}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('Post Error', e);
    }
}

export const api = {
    /**
     * Initial data load
     */
    async getInitData(): Promise<InitData | null> {
        try {
            console.log("Fetching init data from:", API_URL);
            const res = await fetch(`${API_URL}/api/init`);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            console.log("Init Data received:", data);
            return data;
        } catch (e) {
            console.error("Init Data Fetch Failed:", e);
            return null;
        }
    },

    /**
     * Log a gym set
     */
    async logSet(planId: string, exerciseId: string, weight: number, reps: number, feeling: string) {
        return post('gym/log', { planId, exerciseId, weight, reps, feeling });
    },

    /**
     * Log a study session
     */
    async logStudySession(examId: string, topicId: string, quality: string) {
        return post('study/log', { examId, topicId, quality });
    },

    // GYM
    async createGymPlan(id: string, dayName: string) {
        return post('gym/create_plan', { id, dayName });
    },
    async addExerciseToPlan(planId: string, moveName: string) {
        return post('gym/add_exercise_to_plan', { planId, moveName });
    },
    async deleteGymPlan(id: string) {
        return post('gym/delete_plan', { id });
    },

    // STUDY
    async createExam(id: string, name: string, date: string) {
        return post('study/create_exam', { id, name, date });
    },
    async deleteExam(id: string) {
        return post('study/delete_exam', { id });
    },
    async createTopic(id: string, examId: string, name: string, totalSessionsGoal: number) {
        return post('study/create_topic', { id, examId, name, totalSessionsGoal });
    },
    async deleteTopic(id: string) {
        return post('study/delete_topic', { id });
    },

    // TASKS
    async createTask(task: Task) {
        return post('tasks/create', task);
    },
    async updateTask(task: Task) {
        return post('tasks/update', task);
    },
    async deleteTask(id: string) {
        return post('tasks/delete', { id });
    },

    /**
     * Sync tasks (full overwrite for now) - DEPRECATED
     */
    async syncTasks(_localTasks: Task[]) {
        // return post('tasks/sync', { localTasks });
    }
};
