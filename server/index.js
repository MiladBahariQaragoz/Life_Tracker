const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');
const { calculateGymXP, calculateStudyXP, calculateTaskXP, calculateLevel } = require('./utils/xpSystem');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const db = require('./db'); // Postgres Connection

const app = express();

// --- GEMINI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function runAI(prompt) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing from process.env");
            return "AI Error: No API Key configured. Please check .env file.";
        }
        console.log("🤖 Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("✅ Gemini response received (length: " + text.length + ")");
        return text;
    } catch (e) {
        console.error("❌ Gemini API Error:", e);
        return "AI Error: " + e.message;
    }
}

const PORT = process.env.PORT || 3001;
const CREDENTIALS_PATH = path.join(__dirname, 'service-account.json');

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// Request Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- INIT DB ---
db.initDb().catch(console.error);

// --- CALENDAR HELPER ---
async function getCalendar() {
    try {
        await fs.access(CREDENTIALS_PATH).catch(() => { throw new Error('No Creds'); });
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        return google.calendar({ version: 'v3', auth });
    } catch (e) {
        console.error('Google Calendar Sync skipped. Error:', e.message);
        return null;
    }
}

// --- HELPER: Boolean Conversion ---
const bool = (val) => val === 1;
const toInt = (bool) => bool ? 1 : 0;

// --- ROUTES ---

// Init
app.get('/api/init', async (req, res) => {
    try {
        // Fetch All Data
        const gymPlansRes = await db.query('SELECT * FROM GymPlan');
        const gymPlans = gymPlansRes.rows;

        const gymExercisesRes = await db.query('SELECT * FROM GymExercise');
        const gymExercises = gymExercisesRes.rows;

        // Nest exercises into plans
        const plansWithExercises = gymPlans.map(plan => ({
            ...plan,
            exercises: gymExercises.filter(ex => ex.planId === plan.id)
        }));

        const examsRes = await db.query('SELECT * FROM Exam');
        const exams = examsRes.rows;

        const examTopicsRes = await db.query('SELECT * FROM ExamTopic');
        const examTopics = examTopicsRes.rows;

        // Nest topics into exams
        const examsWithTopics = exams.map(exam => ({
            ...exam,
            topics: examTopics.filter(t => t.examId === exam.id)
        }));

        const tasksRes = await db.query('SELECT * FROM Task');
        const tasks = tasksRes.rows.map(t => ({
            ...t,
            completed: bool(t.completed),
            isMinimum: bool(t.isMinimum)
        }));

        const gymMovesRes = await db.query('SELECT * FROM GymMoveReference ORDER BY pageIndex ASC');
        const gymMoves = gymMovesRes.rows;

        res.json({
            gymPlans: plansWithExercises,
            exams: examsWithTopics,
            tasks,
            gymMoves
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load data: ' + e.toString() });
    }
});

// --- XP PREVIEW ROUTES ---
app.post('/api/xp/preview/gym', async (req, res) => {
    try {
        const { session } = req.body;
        const history = {};
        if (session.sets && session.sets.length > 0) {
            for (const set of session.sets) {
                // Find last set for this exercise
                const lastSetRes = await db.query(`
                    SELECT * FROM GymSet 
                    JOIN GymSession ON GymSet.sessionId = GymSession.id
                    WHERE GymSet.exerciseId = $1 
                    ORDER BY GymSession.date DESC 
                    LIMIT 1
                `, [set.exerciseId]);

                const lastSet = lastSetRes.rows[0];

                if (lastSet) {
                    history[set.exerciseId] = {
                        lastWeight: lastSet.weight,
                        lastReps: lastSet.reps
                    };
                }
            }
        }
        const result = calculateGymXP(session, history);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/xp/preview/study', (req, res) => {
    try {
        const { session, examDate } = req.body;
        const result = calculateStudyXP(session, { date: examDate });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/xp/preview/task', (req, res) => {
    try {
        const { task } = req.body;
        const result = calculateTaskXP(task);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get('/api/xp/user', async (req, res) => {
    try {
        let userXPRes = await db.query('SELECT * FROM UserXP WHERE id = $1', ['user']);
        let userXP = userXPRes.rows[0];

        if (!userXP) {
            await db.query('INSERT INTO UserXP (id, totalXP, level) VALUES ($1, $2, $3)', ['user', 0, 1]);
            userXP = { id: 'user', totalXP: 0, level: 1 };
        }
        const levelInfo = calculateLevel(userXP.totalXP);
        if (userXP.level !== levelInfo.level) {
            await db.query('UPDATE UserXP SET level = $1 WHERE id = $2', [levelInfo.level, 'user']);
        }
        res.json({ ...userXP, ...levelInfo });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// GYM
app.post('/api/gym/log', async (req, res) => {
    try {
        const { planId, exerciseId, weight, reps, feeling, rpe, restInterval } = req.body;

        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

        // 1. Find or Create Session
        let sessionRes = await db.query(`
            SELECT * FROM GymSession 
            WHERE workoutPlanId = $1 AND date >= $2 AND date <= $3
            LIMIT 1
        `, [planId, startOfDay, endOfDay]);

        let session = sessionRes.rows[0];

        if (!session) {
            const newId = crypto.randomUUID();
            await db.query(`
                INSERT INTO GymSession (id, workoutPlanId, startTime, preWorkoutState, xp, date)
                VALUES ($1, $2, $3, $4, 0, $5)
            `, [newId, planId, new Date().toISOString(), "Normal", new Date().toISOString()]);
            session = { id: newId, xp: 0 };
        }

        const initialSessionXP = session.xp || 0;

        // 2. Log Set
        await db.query(`
            INSERT INTO GymSet (id, sessionId, exerciseId, weight, reps, rpe, restInterval, feeling)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [crypto.randomUUID(), session.id, exerciseId, Number(weight), Number(reps), rpe ? Number(rpe) : null, restInterval ? Number(restInterval) : null, feeling || '']);

        // 3. Update Last Stats
        await db.query('UPDATE GymExercise SET lastWeight = $1, lastReps = $2 WHERE id = $3', [Number(weight), Number(reps), exerciseId]);

        // 4. Calculate Session XP
        // Get all sets for this session
        const currentSetsRes = await db.query('SELECT * FROM GymSet WHERE sessionId = $1', [session.id]);
        const currentSets = currentSetsRes.rows;
        const fullSession = { ...session, sets: currentSets };

        // History check
        const history = {};
        for (const set of currentSets) {
            const lastSetRes = await db.query(`
                SELECT * FROM GymSet 
                JOIN GymSession ON GymSet.sessionId = GymSession.id
                WHERE GymSet.exerciseId = $1 AND GymSession.date < $2
                ORDER BY GymSession.date DESC 
                LIMIT 1
            `, [set.exerciseId, startOfDay]); // Strictly before today

            const lastSet = lastSetRes.rows[0];

            if (lastSet) {
                history[set.exerciseId] = { lastWeight: lastSet.weight, lastReps: lastSet.reps };
            }
        }

        const xpResult = calculateGymXP(fullSession, history);
        const newSessionXP = xpResult.totalXP;
        const deltaXP = newSessionXP - initialSessionXP;

        // 5. Update Session XP
        await db.query('UPDATE GymSession SET endTime = $1, xp = $2, xpBreakdown = $3 WHERE id = $4',
            [new Date().toISOString(), newSessionXP, JSON.stringify(xpResult.breakdown), session.id]);

        if (deltaXP !== 0) {
            const userXPRes = await db.query('SELECT * FROM UserXP WHERE id = $1', ['user']);
            const userXP = userXPRes.rows[0];
            const newTotal = (userXP ? userXP.totalXP : 0) + deltaXP;
            const levelInfo = calculateLevel(newTotal);

            await db.query('UPDATE UserXP SET totalXP = $1, level = $2 WHERE id = $3',
                [newTotal, levelInfo.level, 'user']);
        }

        res.json({
            success: true,
            xpGained: deltaXP,
            totalSessionXP: newSessionXP,
            breakdown: xpResult.breakdown,
            multipliers: xpResult.multipliersApplied,
            caps: xpResult.capsApplied
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/create_plan', async (req, res) => {
    try {
        const { id, dayName } = req.body;
        await db.query('INSERT INTO GymPlan (id, dayName) VALUES ($1, $2)', [id, dayName]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/delete_plan', async (req, res) => {
    try {
        const { id } = req.body;
        await db.query('DELETE FROM GymPlan WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/add_exercise_to_plan', async (req, res) => {
    try {
        const { planId, moveName } = req.body;
        let exerciseId = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Check duplicate ID
        const existingRes = await db.query('SELECT id FROM GymExercise WHERE id = $1', [exerciseId]);
        if (existingRes.rows[0]) exerciseId = `${exerciseId}-${Date.now()}`;

        await db.query(`
            INSERT INTO GymExercise (id, planId, name, targetSets, targetReps)
            VALUES ($1, $2, $3, 3, 10)
        `, [exerciseId, planId, moveName]);

        res.json({ success: true, exerciseId });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/delete_exercise', async (req, res) => {
    try {
        const { id } = req.body;
        await db.query('DELETE FROM GymExercise WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// STUDY
app.post('/api/study/log', async (req, res) => {
    try {
        const { examId, topicId, quality, environment, interruptions, preSessionActivity, durationMinutes = 60 } = req.body;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        const topicRes = await db.query('SELECT * FROM ExamTopic WHERE id = $1', [topicId]);
        const topic = topicRes.rows[0];

        // Need exam date
        const examRes = await db.query('SELECT * FROM Exam WHERE id = $1', [examId]);
        const exam = examRes.rows[0];

        const isTopicCompleted = topic && (topic.sessionsCompleted + 1 >= topic.totalSessionsGoal);

        const sessionData = {
            durationMinutes: Number(durationMinutes),
            quality: quality || 'Normal',
            interruptions: Number(interruptions || 0),
            preSessionActivity: preSessionActivity,
            isTopicCompleted: isTopicCompleted
        };
        const xpResult = calculateStudyXP(sessionData, { date: exam ? exam.date : null });

        const xp = xpResult.totalXP;

        await db.query(`
            INSERT INTO StudySession (id, topicId, quality, startTime, endTime, environment, interruptions, preSessionActivity, xp, xpBreakdown)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [crypto.randomUUID(), topicId, quality, startTime.toISOString(), endTime.toISOString(), environment, Number(interruptions), preSessionActivity, xp, JSON.stringify(xpResult.breakdown)]);

        if (topic) {
            await db.query('UPDATE ExamTopic SET sessionsCompleted = sessionsCompleted + 1 WHERE id = $1', [topicId]);
        }

        // User XP
        const userXPRes = await db.query('SELECT * FROM UserXP WHERE id = $1', ['user']);
        const userXP = userXPRes.rows[0];
        const newTotal = (userXP ? userXP.totalXP : 0) + xp;
        const levelInfo = calculateLevel(newTotal);
        await db.query('UPDATE UserXP SET totalXP = $1, level = $2 WHERE id = $3', [newTotal, levelInfo.level, 'user']);

        res.json({
            success: true,
            xpGained: xp,
            breakdown: xpResult.breakdown
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/create_exam', async (req, res) => {
    try {
        const { id, name, date } = req.body;
        await db.query('INSERT INTO Exam (id, name, date) VALUES ($1, $2, $3)', [id, name, date]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/delete_exam', async (req, res) => {
    try {
        const { id } = req.body;
        await db.query('DELETE FROM Exam WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/create_topic', async (req, res) => {
    try {
        const { id, examId, name, totalSessionsGoal } = req.body;
        await db.query('INSERT INTO ExamTopic (id, examId, name, totalSessionsGoal, sessionsCompleted) VALUES ($1, $2, $3, $4, 0)',
            [id, examId, name, Number(totalSessionsGoal)]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/delete_topic', async (req, res) => {
    try {
        const { id } = req.body;
        await db.query('DELETE FROM ExamTopic WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// TASKS (Simplified - No XP)
app.post('/api/tasks/create', async (req, res) => {
    try {
        const task = req.body;

        // Calendar Sync
        if (task.dueDate) {
            const calendar = await getCalendar();
            if (calendar) {
                try {
                    const startDate = new Date(task.dueDate);
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 1);

                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
                    const event = await calendar.events.insert({
                        calendarId: calendarId,
                        requestBody: {
                            summary: task.title,
                            description: 'Life Tracker Task',
                            start: { date: startDate.toISOString().split('T')[0] },
                            end: { date: endDate.toISOString().split('T')[0] }
                        }
                    });
                    task.calendarEventId = event.data.id;
                } catch (calError) {
                    console.error('Calendar Create Error', calError);
                }
            }
        }

        await db.query(`
            INSERT INTO Task (id, title, priority, importance, completed, isMinimum, dueDate, calendarEventId)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            task.id,
            task.title,
            task.priority,
            task.importance || 'medium',
            toInt(task.completed),
            toInt(task.isMinimum),
            task.dueDate ? new Date(task.dueDate).toISOString() : null,
            task.calendarEventId
        ]);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/tasks/update', async (req, res) => {
    try {
        const task = req.body;
        const existingRes = await db.query('SELECT * FROM Task WHERE id = $1', [task.id]);
        const existing = existingRes.rows[0];

        if (!existing) return res.status(404).json({ error: 'Task not found' });

        let calendarEventId = task.calendarEventId || existing.calendarEventId;

        // Calendar Sync (Logic unchanged)
        const calendar = await getCalendar();
        if (calendar && calendarEventId) {
            try {
                if (task.completed) {
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
                    await calendar.events.patch({
                        calendarId: calendarId,
                        eventId: calendarEventId,
                        requestBody: { summary: `✅ ${task.title}` }
                    });
                } else if (!task.dueDate) {
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
                    await calendar.events.delete({ calendarId: calendarId, eventId: calendarEventId });
                    calendarEventId = null;
                } else {
                    const startDate = new Date(task.dueDate);
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 1);
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
                    await calendar.events.patch({
                        calendarId: calendarId,
                        eventId: calendarEventId,
                        requestBody: {
                            summary: task.title,
                            start: { date: startDate.toISOString().split('T')[0] },
                            end: { date: endDate.toISOString().split('T')[0] }
                        }
                    });
                }
            } catch (calError) { console.error('Calendar Logic Error:', calError.message); }
        }

        await db.query(`
            UPDATE Task SET 
                title = $1, priority = $2, importance = $3, completed = $4, isMinimum = $5, dueDate = $6, calendarEventId = $7
            WHERE id = $8
        `, [
            task.title,
            task.priority,
            task.importance,
            toInt(task.completed),
            toInt(task.isMinimum),
            task.dueDate ? new Date(task.dueDate).toISOString() : null,
            calendarEventId,
            task.id
        ]);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/tasks/delete', async (req, res) => {
    try {
        const { id } = req.body;
        const taskRes = await db.query('SELECT * FROM Task WHERE id = $1', [id]);
        const task = taskRes.rows[0];

        if (task && task.calendarEventId) {
            const calendar = await getCalendar();
            if (calendar) {
                try {
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
                    await calendar.events.delete({ calendarId: calendarId, eventId: task.calendarEventId });
                } catch (e) { }
            }
        }

        await db.query('DELETE FROM Task WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// CALENDAR READ (Unchanged)
app.get('/api/calendar/events', async (req, res) => {
    try {
        const calendar = await getCalendar();
        if (!calendar) return res.json([]);

        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: startOfDay,
            timeMax: endOfDay,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items.map(item => {
            const start = item.start.dateTime || item.start.date;
            const end = item.end.dateTime || item.end.date;
            let timeStr = 'All Day';
            let durationStr = '';
            if (item.start.dateTime) {
                const dStart = new Date(start);
                const dEnd = new Date(end);
                timeStr = dStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const diffHrs = (dEnd - dStart) / (1000 * 60 * 60);
                durationStr = diffHrs >= 1 ? `${Math.round(diffHrs * 10) / 10}h` : `${Math.round(diffHrs * 60)}m`;
            }
            return {
                id: item.id,
                title: item.summary || '(No Title)',
                time: timeStr,
                duration: durationStr
            };
        });
        res.json(events);
    } catch (e) {
        console.error('Calendar Fetch Error:', e);
        res.json([]);
    }
});

// AI INTELLIGENCE (Unchanged logic, uses req.body)
app.post('/api/ai/coach', async (req, res) => {
    try {
        const { context, mode, userMessage } = req.body;
        let systemPrompt = `Act as an elite, no-nonsense but encouraging Life Coach. 
        You have the following data about the user:
        - Current Mood: ${context.mood || 'Unknown'}
        - Exams: ${JSON.stringify(context.exams || [])}
        - Tasks: ${JSON.stringify(context.tasks || [])}
        - Recent Gym: ${JSON.stringify(context.gym || [])}
        `;
        if (mode === 'quick') {
            systemPrompt += `\n
            The user just opened the app. They said: "${userMessage || 'I am ready'}".
            Based on their mood and their pending cognitive load (exames/tasks), give them ONE single, high-impact directive or piece of advice on what to specificially focus on RIGHT NOW. 
            Do not be generic. Limit answer to 50 words max.
            `;
        } else if (mode === 'plan') {
            systemPrompt += `\n
             The user wants a plan for the day/week.
             Create a structured, bullet-point plan using the tasks and exams provided. 
             Prioritize based on deadlines and importance.
             Encourage them to fit in a gym session if they haven't gone recently.
             Keep it extremely concise. Maximum 150 words. Use short bullet points.
             `;
        }
        const answer = await runAI(systemPrompt);
        res.json({ answer });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/ai/gym_plan', async (req, res) => {
    try {
        const { history, preferences } = req.body;

        // Fetch valid moves
        const validMovesRes = await db.query('SELECT name FROM GymMoveReference');
        const validMoves = validMovesRes.rows.map(m => m.name);

        const prompt = `
        Act as an expert fitness trainer.
        Create a new gym workout plan for today.
        
        Relevant History: ${JSON.stringify(history || [])}
        User Preferences: ${JSON.stringify(preferences || {})}
        Available Exercises: ${JSON.stringify(validMoves)}

        CRITICAL: You must return the response in RAW JSON format only. Do not wrap in markdown code blocks.
        The JSON schema must be exactly:
        {
          "dayName": "string (e.g. Push Day, Leg Day)",
          "exercises": [
            {
              "name": "string (MUST BE EXACTLY ONE OF THE NAMES FROM Available Exercises)",
              "targetSets": number,
              "targetReps": number
            }
          ]
        }
        
        Make it a challenging but doable workout based on history.
        IMPORTANT: Do not invent exercise names. Use ONLY the exact names provided in Available Exercises list. If an exercise is not in the list, substitute it with the closest available match.
        `;
        let text = await runAI(prompt);
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const plan = JSON.parse(text);
        res.json(plan);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to generate plan. " + e.message });
    }
});

// WEEKLY SCHEDULE
app.get('/api/gym/schedule', async (req, res) => {
    try {
        const scheduleRes = await db.query(`
            SELECT GymWeeklySchedule.*, GymPlan.dayName 
            FROM GymWeeklySchedule 
            JOIN GymPlan ON GymWeeklySchedule.planId = GymPlan.id
            ORDER BY date ASC
        `);
        const schedule = scheduleRes.rows;
        res.json(schedule);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/generate_weekly_schedule', async (req, res) => {
    try {
        const { daysPerWeek, startDate } = req.body;

        // 1. Fetch available plans
        const plansRes = await db.query('SELECT id, dayName FROM GymPlan');
        const plans = plansRes.rows;
        if (plans.length === 0) {
            return res.status(400).json({ error: "No workout templates found. Please create some templates first." });
        }

        // 2. Generate Schedule with AI
        const prompt = `
        Act as a fitness coach. I need a weekly workout schedule.
        
        Available Workout Templates: ${JSON.stringify(plans)}
        User Target: ${daysPerWeek} days of working out this week.
        Start Date: ${startDate} (Monday)
        
        Assign specific Templates to specific Dates for the upcoming 7 days starting from ${startDate}.
        Distribute them logically (e.g. don't put Leg Day two days in a row if possible).
        Leave rest days empty.

        CRITICAL: Return ONLY raw JSON. No markdown.
        Schema:
        [
            {
                "date": "YYYY-MM-DD",
                "planId": "string (MUST correspond to one of the Available Template IDs)"
            }
        ]
        `;

        let text = await runAI(prompt);
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const scheduleItems = JSON.parse(text);

        // 3. Save to DB
        // Transaction manually or simple loop 
        // Postgres has dedicated BEGIN/COMMIT but for simple logic we can do individual queries or a batch if needed.
        // Let's stick to individual to simulate previous logic, but use await.

        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        // Simple loop
        for (const item of scheduleItems) {
            // Validate planId
            if (plans.find(p => p.id === item.planId)) {
                await db.query('DELETE FROM GymWeeklySchedule WHERE date = $1', [item.date]); // specific overwrite
                await db.query('INSERT INTO GymWeeklySchedule (id, date, planId, isDone) VALUES ($1, $2, $3, 0)',
                    [crypto.randomUUID(), item.date, item.planId]);
            }
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to generate schedule: " + e.message });
    }
});

app.post('/api/gym/schedule/complete', async (req, res) => {
    try {
        const { id, isDone } = req.body;
        await db.query('UPDATE GymWeeklySchedule SET isDone = $1 WHERE id = $2', [isDone ? 1 : 0, id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// --- ANALYTICS ---
app.get('/api/analytics/activity', async (req, res) => {
    try {
        // combine dates from GymSession, StudySession, Tasks (completed)
        const gymRes = await db.query('SELECT date FROM GymSession');
        const studyRes = await db.query('SELECT startTime as date FROM StudySession');
        const tasksRes = await db.query('SELECT dueDate as date FROM Task WHERE completed = 1 AND dueDate IS NOT NULL'); // use dueDate for tasks? or maybe we don't have completedDate

        const counts = {};
        const process = (list) => {
            list.forEach(item => {
                if (!item.date) return;
                // Check if date is Date object (Postgres) or String
                let dStr;
                if (item.date instanceof Date) {
                    dStr = item.date.toISOString().split('T')[0];
                } else {
                    dStr = item.date.split('T')[0];
                }
                counts[dStr] = (counts[dStr] || 0) + 1;
            });
        };

        process(gymRes.rows);
        process(studyRes.rows);
        process(tasksRes.rows);

        const data = Object.keys(counts).map(date => ({
            date,
            count: counts[date],
            intensity: counts[date] > 4 ? 4 : counts[date]
        })).sort((a, b) => a.date.localeCompare(b.date));

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get('/api/analytics/volume', async (req, res) => {
    try {
        // Sum volume (weight * reps) per day
        const rawRes = await db.query(`
            SELECT GymSession.date, GymSet.weight, GymSet.reps 
            FROM GymSet 
            JOIN GymSession ON GymSet.sessionId = GymSession.id
            ORDER BY GymSession.date ASC
        `);
        const raw = rawRes.rows;

        const volByDate = {};
        raw.forEach(row => {
            let d;
            if (row.date instanceof Date) {
                d = row.date.toISOString().split('T')[0];
            } else {
                d = row.date.split('T')[0];
            }
            const vol = row.weight * row.reps;
            volByDate[d] = (volByDate[d] || 0) + vol;
        });

        const data = Object.keys(volByDate).map(date => ({
            date,
            volume: volByDate[date]
        })).sort((a, b) => a.date.localeCompare(b.date));

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get('/api/analytics/radar', async (req, res) => {
    try {
        // Topic Mastery: Exams -> Topics -> Sessions Completed / Goal
        const topicsRes = await db.query('SELECT name, sessionsCompleted, totalSessionsGoal FROM ExamTopic');
        const topics = topicsRes.rows;

        // If too many topics, maybe limit? Or aggregate?
        const data = topics.map(t => ({
            subject: t.name,
            A: t.totalSessionsGoal > 0 ? Math.round((t.sessionsCompleted / t.totalSessionsGoal) * 100) : 0,
            fullMark: 100
        }));

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
