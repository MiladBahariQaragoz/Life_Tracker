const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));
// Force no-verify for DigitalOcean managed DBs (only if not local)
const sslMode = connectionString && !isLocal && !connectionString.includes('sslmode=') ? '?sslmode=no-verify' : '';

// Parse password manually to ensure it is a string (fixes numeric password SASL error)
let config = {
    connectionString: connectionString ? `${connectionString}${sslMode}` : undefined,
    ssl: connectionString && !isLocal ? { rejectUnauthorized: false } : undefined
};

try {
    if (connectionString) {
        const url = new URL(connectionString);
        if (url.password) {
            config.password = String(url.password);
        }
    }
} catch (e) {
    // console.log('Could not parse URL for password extraction', e);
}

const pool = new Pool(config);

// Test connection
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS GymPlan (
                id VARCHAR(255) PRIMARY KEY,
                dayName VARCHAR(255) NOT NULL
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS GymExercise (
                id VARCHAR(255) PRIMARY KEY,
                planId VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                targetSets INTEGER NOT NULL,
                targetReps INTEGER NOT NULL,
                lastWeight REAL DEFAULT 0,
                lastReps INTEGER DEFAULT 0,
                FOREIGN KEY (planId) REFERENCES GymPlan(id) ON DELETE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS GymSession (
                id VARCHAR(255) PRIMARY KEY,
                workoutPlanId VARCHAR(255) NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                startTime TIMESTAMP,
                endTime TIMESTAMP,
                preWorkoutState VARCHAR(255),
                xp INTEGER DEFAULT 0,
                xpBreakdown TEXT DEFAULT '[]'
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS GymWeeklySchedule (
                id VARCHAR(255) PRIMARY KEY,
                date DATE NOT NULL,
                planId VARCHAR(255) NOT NULL,
                isDone INTEGER DEFAULT 0,
                FOREIGN KEY (planId) REFERENCES GymPlan(id) ON DELETE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS GymSet (
                id VARCHAR(255) PRIMARY KEY,
                sessionId VARCHAR(255) NOT NULL,
                exerciseId VARCHAR(255) NOT NULL,
                weight REAL NOT NULL,
                reps INTEGER NOT NULL,
                rpe INTEGER,
                restInterval INTEGER,
                feeling TEXT,
                FOREIGN KEY (sessionId) REFERENCES GymSession(id) ON DELETE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS GymMoveReference (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                "group" VARCHAR(255) NOT NULL,
                pageIndex INTEGER NOT NULL,
                imageUrl TEXT
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS Exam (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                date TIMESTAMP NOT NULL
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ExamTopic (
                id VARCHAR(255) PRIMARY KEY,
                examId VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                totalSessionsGoal INTEGER NOT NULL,
                sessionsCompleted INTEGER DEFAULT 0,
                FOREIGN KEY (examId) REFERENCES Exam(id) ON DELETE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS StudySession (
                id VARCHAR(255) PRIMARY KEY,
                topicId VARCHAR(255) NOT NULL,
                quality VARCHAR(255) NOT NULL,
                startTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                endTime TIMESTAMP,
                environment VARCHAR(255),
                interruptions INTEGER DEFAULT 0,
                preSessionActivity TEXT,
                xp INTEGER DEFAULT 0,
                xpBreakdown TEXT DEFAULT '[]',
                FOREIGN KEY (topicId) REFERENCES ExamTopic(id) ON DELETE CASCADE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS Task (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                priority VARCHAR(255) NOT NULL,
                importance VARCHAR(255) DEFAULT 'medium',
                completed INTEGER DEFAULT 0,
                isMinimum INTEGER DEFAULT 0,
                dueDate TIMESTAMP,
                calendarEventId VARCHAR(255)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS UserXP (
                id VARCHAR(255) PRIMARY KEY,
                totalXP INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1
            );
        `);

        // Seed Initial User if not exists
        const userCheck = await client.query('SELECT id FROM UserXP WHERE id = $1', ['user']);
        if (userCheck.rows.length === 0) {
            await client.query('INSERT INTO UserXP (id, totalXP, level) VALUES ($1, $2, $3)', ['user', 0, 1]);
        }

        await client.query('COMMIT');
        console.log('✅ Database schema initialized');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Database Initialization Failed:', e);
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    initDb
};
