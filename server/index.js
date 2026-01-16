const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Helper to read DB
async function getDb() {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
}

// Helper to write DB
async function saveDb(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// --- ROUTES ---

// Init
app.get('/api/init', async (req, res) => {
    try {
        const db = await getDb();
        res.json({
            gymPlans: db.gymPlans,
            exams: db.exams,
            tasks: db.tasks,
            gymMoves: db.gymMoves
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// GYM
app.post('/api/gym/log', async (req, res) => {
    try {
        const { planId, exerciseId, weight, reps, feeling } = req.body;
        const db = await getDb();

        // Log Session
        db.gymSessions.push({
            timestamp: new Date().toISOString(),
            planId, exerciseId, weight, reps, feeling
        });

        // Update Last Stats in Plan (Optimistic-like but persisted)
        const plan = db.gymPlans.find(p => p.id === planId);
        if (plan) {
            const exercise = plan.exercises.find(e => e.id === exerciseId);
            if (exercise) {
                exercise.lastWeight = weight;
                exercise.lastReps = reps;
            }
        }

        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/create_plan', async (req, res) => {
    try {
        const { id, dayName } = req.body;
        const db = await getDb();
        db.gymPlans.push({ id, dayName, exercises: [] });
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/delete_plan', async (req, res) => {
    try {
        const { id } = req.body;
        const db = await getDb();
        db.gymPlans = db.gymPlans.filter(p => p.id !== id);
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/gym/add_exercise_to_plan', async (req, res) => {
    try {
        const { planId, moveName } = req.body;
        const db = await getDb();

        const plan = db.gymPlans.find(p => p.id === planId);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const exerciseId = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newExercise = {
            id: exerciseId,
            name: moveName,
            targetSets: 3,
            targetReps: 10,
            lastWeight: 0,
            lastReps: 0
        };

        plan.exercises.push(newExercise);
        await saveDb(db);
        res.json({ success: true, exerciseId });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// STUDY
app.post('/api/study/log', async (req, res) => {
    try {
        const { examId, topicId, quality } = req.body;
        const db = await getDb();

        db.studySessions.push({
            timestamp: new Date().toISOString(),
            examId, topicId, quality
        });

        const exam = db.exams.find(e => e.id === examId);
        if (exam) {
            const topic = exam.topics.find(t => t.id === topicId);
            if (topic) {
                topic.sessionsCompleted = (topic.sessionsCompleted || 0) + 1;
            }
        }

        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/create_exam', async (req, res) => {
    try {
        const { id, name, date } = req.body;
        const db = await getDb();
        db.exams.push({ id, name, date, topics: [] });
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/delete_exam', async (req, res) => {
    try {
        const { id } = req.body;
        const db = await getDb();
        db.exams = db.exams.filter(e => e.id !== id);
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/create_topic', async (req, res) => {
    try {
        const { id, examId, name, totalSessionsGoal } = req.body;
        const db = await getDb();
        const exam = db.exams.find(e => e.id === examId);
        if (exam) {
            exam.topics.push({
                id, name, totalSessionsInitial: totalSessionsGoal, sessionsCompleted: 0
            });
            await saveDb(db);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/study/delete_topic', async (req, res) => {
    try {
        const { id } = req.body;
        const db = await getDb();
        db.exams.forEach(exam => {
            exam.topics = exam.topics.filter(t => t.id !== id);
        });
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// TASKS
app.post('/api/tasks/create', async (req, res) => {
    try {
        const task = req.body;
        const db = await getDb();
        db.tasks.push(task);
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/tasks/update', async (req, res) => {
    try {
        const task = req.body;
        const db = await getDb();
        const index = db.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            db.tasks[index] = task;
            await saveDb(db);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/tasks/delete', async (req, res) => {
    try {
        const { id } = req.body;
        const db = await getDb();
        db.tasks = db.tasks.filter(t => t.id !== id);
        await saveDb(db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
