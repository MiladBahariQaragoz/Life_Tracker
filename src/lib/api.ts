import type { GymPlan, Exam, Task } from '../data/mock';

// TODO: Replace with your actual Google Apps Script Web App URL
const API_URL = import.meta.env.VITE_API_URL || '';

export type InitData = {
    gymPlans: GymPlan[];
    exams: Exam[];
    tasks: Task[];
    gymMoves: { pageIndex: number; name: string; group: string; }[];
};

export const api = {
    /**
     * Initial data load
     */
    async getInitData(): Promise<InitData | null> {
        if (!API_URL) {
            console.error("API_URL is missing");
            return null;
        }
        try {
            console.log("Fetching init data from:", API_URL);
            const res = await fetch(`${API_URL}?route=init`);
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
        if (!API_URL) return;
        return post('gym/log', { planId, exerciseId, weight, reps, feeling });
    },

    /**
     * Log a study session
     */
    async logStudySession(examId: string, topicId: string, quality: string) {
        if (!API_URL) return;
        return post('study/log', { examId, topicId, quality });
    },

    // GYM
    async createGymPlan(id: string, dayName: string) {
        if (!API_URL) return;
        return post('gym/create_plan', { id, dayName });
    },
    async addExerciseToPlan(planId: string, moveName: string) {
        if (!API_URL) return;
        return post('gym/add_exercise_to_plan', { planId, moveName });
    },
    async deleteGymPlan(id: string) {
        if (!API_URL) return;
        return post('gym/delete_plan', { id });
    },

    // STUDY
    async createExam(id: string, name: string, date: string) {
        if (!API_URL) return;
        return post('study/create_exam', { id, name, date });
    },
    async deleteExam(id: string) {
        if (!API_URL) return;
        return post('study/delete_exam', { id });
    },
    async createTopic(id: string, examId: string, name: string, totalSessionsGoal: number) {
        if (!API_URL) return;
        return post('study/create_topic', { id, examId, name, totalSessionsGoal });
    },
    async deleteTopic(id: string) {
        if (!API_URL) return;
        return post('study/delete_topic', { id });
    },

    // TASKS
    async createTask(task: Task) {
        if (!API_URL) return;
        return post('tasks/create', task);
    },
    async updateTask(task: Task) {
        if (!API_URL) return;
        return post('tasks/update', task);
    },
    async deleteTask(id: string) {
        if (!API_URL) return;
        return post('tasks/delete', { id });
    },

    /**
     * Sync tasks (full overwrite for now) - DEPRECATED for ADD/DELETE, keeping for bulk sync if needed
     */
    async syncTasks(localTasks: Task[]) {
        if (!API_URL) return;
        // return post('tasks/sync', { localTasks });
    }
};

/**
 * Helper to send POST requests.
 * We use text/plain to avoid preflight OPTIONS requests if possible, 
 * though GAS handles JSON mostly fine now.
 */
async function post(route: string, data: any) {
    try {
        await fetch(`${API_URL}?route=${route}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('Post Error', e);
    }
}
