
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');
const { calculateGymXP, calculateStudyXP, calculateTaskXP, calculateLevel } = require('./utils/xpSystem');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const db = require('./db'); // SQLite Connection

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
app.get('/api/init', (req, res) => {
    try {
        // Fetch All Data
        const gymPlans = db.prepare('SELECT * FROM GymPlan').all();
        const gymExercises = db.prepare('SELECT * FROM GymExercise').all();

        // Nest exercises into plans
        const plansWithExercises = gymPlans.map(plan => ({
            ...plan,
            exercises: gymExercises.filter(ex => ex.planId === plan.id)
        }));

        const exams = db.prepare('SELECT * FROM Exam').all();
        const examTopics = db.prepare('SELECT * FROM ExamTopic').all();

        // Nest topics into exams
        const examsWithTopics = exams.map(exam => ({
            ...exam,
            topics: examTopics.filter(t => t.examId === exam.id)
        }));

        const tasksRaw = db.prepare('SELECT * FROM Task').all();
        const tasks = tasksRaw.map(t => ({
            ...t,
            completed: bool(t.completed),
            isMinimum: bool(t.isMinimum)
        }));

        const gymMoves = db.prepare('SELECT * FROM GymMoveReference ORDER BY pageIndex ASC').all();

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
app.post('/api/xp/preview/gym', (req, res) => {
    try {
        const { session } = req.body;
        const history = {};
        if (session.sets && session.sets.length > 0) {
            for (const set of session.sets) {
                // Find last set for this exercise
                const lastSet = db.prepare(`
                    SELECT * FROM GymSet 
                    JOIN GymSession ON GymSet.sessionId = GymSession.id
                    WHERE GymSet.exerciseId = ? 
                    ORDER BY GymSession.date DESC 
                    LIMIT 1
                `).get(set.exerciseId);

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

app.get('/api/xp/user', (req, res) => {
    try {
        let userXP = db.prepare('SELECT * FROM UserXP WHERE id = ?').get('user');
        if (!userXP) {
            db.prepare('INSERT INTO UserXP (id, totalXP, level) VALUES (?, ?, ?)').run('user', 0, 1);
            userXP = { id: 'user', totalXP: 0, level: 1 };
        }
        const levelInfo = calculateLevel(userXP.totalXP);
        if (userXP.level !== levelInfo.level) {
            db.prepare('UPDATE UserXP SET level = ? WHERE id = ?').run(levelInfo.level, 'user');
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
        let session = db.prepare(`
            SELECT * FROM GymSession 
            WHERE workoutPlanId = ? AND date >= ? AND date <= ?
            LIMIT 1
        `).get(planId, startOfDay, endOfDay);

        if (!session) {
            const newId = crypto.randomUUID();
            db.prepare(`
                INSERT INTO GymSession (id, workoutPlanId, startTime, preWorkoutState, xp, date)
                VALUES (?, ?, ?, ?, 0, ?)
            `).run(newId, planId, new Date().toISOString(), "Normal", new Date().toISOString());
            session = { id: newId, xp: 0 };
        }

        const initialSessionXP = session.xp || 0;

        // 2. Log Set
        db.prepare(`
            INSERT INTO GymSet (id, sessionId, exerciseId, weight, reps, rpe, restInterval, feeling)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), session.id, exerciseId, Number(weight), Number(reps), rpe ? Number(rpe) : null, restInterval ? Number(restInterval) : null, feeling || '');

        // 3. Update Last Stats
        db.prepare('UPDATE GymExercise SET lastWeight = ?, lastReps = ? WHERE id = ?')
            .run(Number(weight), Number(reps), exerciseId);

        // 4. Calculate Session XP
        // Get all sets for this session
        const currentSets = db.prepare('SELECT * FROM GymSet WHERE sessionId = ?').all(session.id);
        const fullSession = { ...session, sets: currentSets };

        // History check
        const history = {};
        for (const set of currentSets) {
            const lastSet = db.prepare(`
                SELECT * FROM GymSet 
                JOIN GymSession ON GymSet.sessionId = GymSession.id
                WHERE GymSet.exerciseId = ? AND GymSession.date < ?
                ORDER BY GymSession.date DESC 
                LIMIT 1
            `).get(set.exerciseId, startOfDay); // Strictly before today

            if (lastSet) {
                history[set.exerciseId] = { lastWeight: lastSet.weight, lastReps: lastSet.reps };
            }
        }

        const xpResult = calculateGymXP(fullSession, history);
        const newSessionXP = xpResult.totalXP;
        const deltaXP = newSessionXP - initialSessionXP;

        // 5. Update Session XP
        db.prepare('UPDATE GymSession SET endTime = ?, xp = ?, xpBreakdown = ? WHERE id = ?')
            .run(new Date().toISOString(), newSessionXP, JSON.stringify(xpResult.breakdown), session.id);

        if (deltaXP !== 0) {
            const userXP = db.prepare('SELECT * FROM UserXP WHERE id = ?').get('user');
            const newTotal = (userXP ? userXP.totalXP : 0) + deltaXP;
            const levelInfo = calculateLevel(newTotal);

            db.prepare('UPDATE UserXP SET totalXP = ?, level = ? WHERE id = ?')
                .run(newTotal, levelInfo.level, 'user');
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

app.post('/api/gym/create_plan', (req, res) => {
    try {
        const { id, dayName } = req.body;
        db.prepare('INSERT INTO GymPlan (id, dayName) VALUES (?, ?)').run(id, dayName);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/delete_plan', (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM GymPlan WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/add_exercise_to_plan', (req, res) => {
    try {
        const { planId, moveName } = req.body;
        let exerciseId = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Check duplicate ID
        const existing = db.prepare('SELECT id FROM GymExercise WHERE id = ?').get(exerciseId);
        if (existing) exerciseId = `${exerciseId}-${Date.now()}`;

        db.prepare(`
            INSERT INTO GymExercise (id, planId, name, targetSets, targetReps)
            VALUES (?, ?, ?, 3, 10)
        `).run(exerciseId, planId, moveName);

        res.json({ success: true, exerciseId });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/delete_exercise', (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM GymExercise WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// STUDY
app.post('/api/study/log', (req, res) => {
    try {
        const { examId, topicId, quality, environment, interruptions, preSessionActivity, durationMinutes = 60 } = req.body;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        const topic = db.prepare('SELECT * FROM ExamTopic WHERE id = ?').get(topicId);
        // Need exam date
        const exam = db.prepare('SELECT * FROM Exam WHERE id = ?').get(examId);

        const isTopicCompleted = topic && (topic.sessionsCompleted + 1 >= topic.totalSessionsGoal);

        const sessionData = {
            durationMinutes: Number(durationMinutes),
            quality: quality || 'Normal',
            interruptions: Number(interruptions || 0),
            preSessionActivity: preSessionActivity,
            isTopicCompleted: isTopicCompleted
        };
        const xpResult = calculateStudyXP(sessionData, { date: exam ? exam.date : null }); // Date string should work if logic parses it

        const xp = xpResult.totalXP;

        db.prepare(`
            INSERT INTO StudySession (id, topicId, quality, startTime, endTime, environment, interruptions, preSessionActivity, xp, xpBreakdown)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), topicId, quality, startTime.toISOString(), endTime.toISOString(), environment, Number(interruptions), preSessionActivity, xp, JSON.stringify(xpResult.breakdown));

        if (topic) {
            db.prepare('UPDATE ExamTopic SET sessionsCompleted = sessionsCompleted + 1 WHERE id = ?').run(topicId);
        }

        // User XP
        const userXP = db.prepare('SELECT * FROM UserXP WHERE id = ?').get('user');
        const newTotal = (userXP ? userXP.totalXP : 0) + xp;
        const levelInfo = calculateLevel(newTotal);
        db.prepare('UPDATE UserXP SET totalXP = ?, level = ? WHERE id = ?').run(newTotal, levelInfo.level, 'user');

        res.json({
            success: true,
            xpGained: xp,
            breakdown: xpResult.breakdown
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/create_exam', (req, res) => {
    try {
        const { id, name, date } = req.body;
        db.prepare('INSERT INTO Exam (id, name, date) VALUES (?, ?, ?)').run(id, name, date);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/delete_exam', (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM Exam WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/create_topic', (req, res) => {
    try {
        const { id, examId, name, totalSessionsGoal } = req.body;
        db.prepare('INSERT INTO ExamTopic (id, examId, name, totalSessionsGoal, sessionsCompleted) VALUES (?, ?, ?, ?, 0)')
            .run(id, examId, name, Number(totalSessionsGoal));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/delete_topic', (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM ExamTopic WHERE id = ?').run(id);
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

        db.prepare(`
            INSERT INTO Task (id, title, priority, importance, completed, isMinimum, dueDate, calendarEventId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            task.id,
            task.title,
            task.priority,
            task.importance || 'medium',
            toInt(task.completed),
            toInt(task.isMinimum),
            task.dueDate ? new Date(task.dueDate).toISOString() : null,
            task.calendarEventId
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/tasks/update', async (req, res) => {
    try {
        const task = req.body;
        const existing = db.prepare('SELECT * FROM Task WHERE id = ?').get(task.id);

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

        db.prepare(`
            UPDATE Task SET 
                title = ?, priority = ?, importance = ?, completed = ?, isMinimum = ?, dueDate = ?, calendarEventId = ?
            WHERE id = ?
        `).run(
            task.title,
            task.priority,
            task.importance,
            toInt(task.completed),
            toInt(task.isMinimum),
            task.dueDate ? new Date(task.dueDate).toISOString() : null,
            calendarEventId,
            task.id
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/tasks/delete', async (req, res) => {
    try {
        const { id } = req.body;
        const task = db.prepare('SELECT * FROM Task WHERE id = ?').get(id);

        if (task && task.calendarEventId) {
            const calendar = await getCalendar();
            if (calendar) {
                try {
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
                    await calendar.events.delete({ calendarId: calendarId, eventId: task.calendarEventId });
                } catch (e) { }
            }
        }

        db.prepare('DELETE FROM Task WHERE id = ?').run(id);
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
        const validMoves = db.prepare('SELECT name FROM GymMoveReference').all().map(m => m.name);

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
app.get('/api/gym/schedule', (req, res) => {
    try {
        const schedule = db.prepare(`
            SELECT GymWeeklySchedule.*, GymPlan.dayName 
            FROM GymWeeklySchedule 
            JOIN GymPlan ON GymWeeklySchedule.planId = GymPlan.id
            ORDER BY date ASC
        `).all();
        res.json(schedule);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/generate_weekly_schedule', async (req, res) => {
    try {
        const { daysPerWeek, startDate } = req.body;

        // 1. Fetch available plans
        const plans = db.prepare('SELECT id, dayName FROM GymPlan').all();
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
        // Clear future schedule from start date? Or just overwrite specific dates? 
        // Let's clear the week starting from startDate
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        // Transaction
        const insert = db.prepare('INSERT INTO GymWeeklySchedule (id, date, planId, isDone) VALUES (?, ?, ?, 0)');
        const deleteOld = db.prepare('DELETE FROM GymWeeklySchedule WHERE date = ?');

        // Simple loop
        for (const item of scheduleItems) {
            // Validate planId
            if (plans.find(p => p.id === item.planId)) {
                deleteOld.run(item.date); // specific overwrite
                insert.run(crypto.randomUUID(), item.date, item.planId);
            }
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to generate schedule: " + e.message });
    }
});

app.post('/api/gym/schedule/complete', (req, res) => {
    try {
        const { id, isDone } = req.body;
        db.prepare('UPDATE GymWeeklySchedule SET isDone = ? WHERE id = ?').run(isDone ? 1 : 0, id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// --- ANALYTICS ---
app.get('/api/analytics/activity', (req, res) => {
    try {
        // combine dates from GymSession, StudySession, Tasks (completed)
        const gym = db.prepare('SELECT date FROM GymSession').all();
        const study = db.prepare('SELECT startTime as date FROM StudySession').all();
        const tasks = db.prepare('SELECT dueDate as date FROM Task WHERE completed = 1 AND dueDate IS NOT NULL').all(); // use dueDate for tasks? or maybe we don't have completedDate

        const counts = {};
        const process = (list) => {
            list.forEach(item => {
                if (!item.date) return;
                const d = item.date.split('T')[0];
                counts[d] = (counts[d] || 0) + 1;
            });
        };

        process(gym);
        process(study);
        process(tasks);

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

app.get('/api/analytics/volume', (req, res) => {
    try {
        // Sum volume (weight * reps) per day
        const raw = db.prepare(`
            SELECT GymSession.date, GymSet.weight, GymSet.reps 
            FROM GymSet 
            JOIN GymSession ON GymSet.sessionId = GymSession.id
            ORDER BY GymSession.date ASC
        `).all();

        const volByDate = {};
        raw.forEach(row => {
            const d = row.date.split('T')[0];
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

app.get('/api/analytics/mastery', (req, res) => {
    try {
        const topics = db.prepare('SELECT name, sessionsCompleted, totalSessionsGoal FROM ExamTopic').all();
        const data = topics.map(t => ({
            subject: t.name,
            A: t.sessionsCompleted,
            fullMark: t.totalSessionsGoal
        }));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
