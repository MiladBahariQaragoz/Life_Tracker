import type { GymPlan, Exam, Task, GymMove } from '../types';

// Hardcoded to local backend as GAS is being removed
const API_URL = 'http://127.0.0.1:3001';

export type InitData = {
    gymPlans: GymPlan[];
    exams: Exam[];
    tasks: Task[];
    gymMoves: GymMove[];
};

/**
 * Helper to send POST requests.
 */
import { logEvent } from '../components/SystemLog';

/**
 * Helper to send POST requests.
 */
async function post(route: string, data: any) {
    try {
        const start = Date.now();
        logEvent(`> POST /api/${route}`, 'info', 'system');
        // Log payload
        logEvent(`Payload: ${JSON.stringify(data)}`, 'info', 'system');

        const res = await fetch(`${API_URL}/api/${route}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        const duration = Date.now() - start;

        // Log Response
        logEvent(`Response (${duration}ms): ${JSON.stringify(json).slice(0, 200)}${JSON.stringify(json).length > 200 ? '...' : ''}`, 'info', 'system');

        if (json.error || json.success === false) {
            const errMsg = json.error || 'Unknown Error';
            logEvent(`< ERROR /api/${route} (${duration}ms): ${errMsg}`, 'error', 'system');
        } else {
            logEvent(`< OK /api/${route} (${duration}ms)`, 'success', 'system');
            if (route.includes('ai/')) {
                const answerPreview = json.answer ? json.answer.slice(0, 50) : "OK";
                logEvent(`AI Response: "${answerPreview}..."`, 'success', 'ai');
            }
        }
        return json;
    } catch (e) {
        console.error('Post Error', e);
        logEvent(`Network Error [${route}]: ${String(e)}`, 'error', 'system');
        return { success: false, error: String(e) };
    }
}

export const api = {
    /**
     * Initial data load
     */
    async getInitData(): Promise<InitData | null> {
        try {
            console.log("Fetching init data from:", API_URL);
            const res = await fetch(`${API_URL}/api/init`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            return data;
        } catch (e) {
            console.error("Init Data Fetch Failed:", e);
            return null;
        }
    },

    async getCalendarEvents() {
        try {
            const res = await fetch(`${API_URL}/api/calendar/events`);
            return await res.json();
        } catch (e) { return []; }
    },

    /**
     * Log a gym set
     */
    async logSet(planId: string, exerciseId: string, weight: number, reps: number, feeling: string, rpe?: number, restInterval?: number) {
        return post('gym/log', { planId, exerciseId, weight, reps, feeling, rpe, restInterval });
    },

    /**
     * Log a study session
     */
    async logStudySession(examId: string, topicId: string, quality: string, environment?: string, interruptions?: number, preSessionActivity?: string) {
        return post('study/log', { examId, topicId, quality, environment, interruptions, preSessionActivity });
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
    async deleteGymExercise(id: string) {
        return post('gym/delete_exercise', { id });
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
        return post('tasks/create', { ...task, importance: task.importance });
    },
    async updateTask(task: Task) {
        return post('tasks/update', { ...task, importance: task.importance });
    },
    async deleteTask(id: string) {
        return post('tasks/delete', { id });
    },

    /**
     * Sync tasks (full overwrite for now) - DEPRECATED
     */
    async syncTasks(_localTasks: Task[]) {
        // no-op
    },

    /**
     * Analytics
     */
    async getAnalyticsActivity() {
        try {
            const res = await fetch(`${API_URL}/api/analytics/activity`);
            return await res.json();
        } catch (e) { return []; }
    },

    async getAnalyticsVolume() {
        try {
            const res = await fetch(`${API_URL}/api/analytics/volume`);
            return await res.json();
        } catch (e) { return []; }
    },

    async getAnalyticsMastery() {
        try {
            const res = await fetch(`${API_URL}/api/analytics/mastery`);
            return await res.json();
        } catch (e) { return []; }
    },

    // AI INTELLIGENCE
    async askAiCoach(context: any, mode: 'quick' | 'plan', userMessage?: string) {
        return post('ai/coach', { context, mode, userMessage });
    },

    async generateAiGymPlan(history: any, preferences: any) {
        return post('ai/gym_plan', { history, preferences });
    },

    // WEEKLY SCHEDULE
    async getWeeklySchedule() {
        try {
            const res = await fetch(`${API_URL}/api/gym/schedule`);
            return await res.json();
        } catch (e) { return []; }
    },

    async generateWeeklySchedule(daysPerWeek: number, startDate: string) {
        return post('gym/generate_weekly_schedule', { daysPerWeek, startDate });
    },

    async completeScheduleItem(id: string, isDone: boolean) {
        return post('gym/schedule/complete', { id, isDone });
    }
};
