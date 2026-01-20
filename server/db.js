
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new Database(dbPath); // verbose: console.log

// WAL mode for better performance
db.pragma('journal_mode = WAL');
// Enable Foreign Keys for Cascade actions
db.pragma('foreign_keys = ON');

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS GymPlan (
        id TEXT PRIMARY KEY,
        dayName TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS GymExercise (
        id TEXT PRIMARY KEY,
        planId TEXT NOT NULL,
        name TEXT NOT NULL,
        targetSets INTEGER NOT NULL,
        targetReps INTEGER NOT NULL,
        lastWeight REAL DEFAULT 0,
        lastReps INTEGER DEFAULT 0,
        FOREIGN KEY (planId) REFERENCES GymPlan(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GymSession (
        id TEXT PRIMARY KEY,
        workoutPlanId TEXT NOT NULL,
        date TEXT DEFAULT (datetime('now')),
        startTime TEXT,
        endTime TEXT,
        preWorkoutState TEXT,
        xp INTEGER DEFAULT 0,
        xpBreakdown TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS GymWeeklySchedule (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        planId TEXT NOT NULL,
        isDone INTEGER DEFAULT 0,
        FOREIGN KEY (planId) REFERENCES GymPlan(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GymSet (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        exerciseId TEXT NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        rpe INTEGER,
        restInterval INTEGER,
        feeling TEXT,
        FOREIGN KEY (sessionId) REFERENCES GymSession(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GymMoveReference (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "group" TEXT NOT NULL,
        pageIndex INTEGER NOT NULL,
        imageUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS Exam (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ExamTopic (
        id TEXT PRIMARY KEY,
        examId TEXT NOT NULL,
        name TEXT NOT NULL,
        totalSessionsGoal INTEGER NOT NULL,
        sessionsCompleted INTEGER DEFAULT 0,
        FOREIGN KEY (examId) REFERENCES Exam(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS StudySession (
        id TEXT PRIMARY KEY,
        topicId TEXT NOT NULL,
        quality TEXT NOT NULL,
        startTime TEXT DEFAULT (datetime('now')),
        endTime TEXT,
        environment TEXT,
        interruptions INTEGER DEFAULT 0,
        preSessionActivity TEXT,
        xp INTEGER DEFAULT 0,
        xpBreakdown TEXT DEFAULT '[]',
        FOREIGN KEY (topicId) REFERENCES ExamTopic(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Task (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        priority TEXT NOT NULL,
        importance TEXT DEFAULT 'medium',
        completed INTEGER DEFAULT 0,
        isMinimum INTEGER DEFAULT 0,
        dueDate TEXT,
        calendarEventId TEXT
    );

    CREATE TABLE IF NOT EXISTS UserXP (
        id TEXT PRIMARY KEY,
        totalXP INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1
    );
`);

// Seed Initial User if not exists
const userCheck = db.prepare('SELECT id FROM UserXP WHERE id = ?').get('user');
if (!userCheck) {
    db.prepare('INSERT INTO UserXP (id, totalXP, level) VALUES (?, ?, ?)').run('user', 0, 1);
}

module.exports = db;
