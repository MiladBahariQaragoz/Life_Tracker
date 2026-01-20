
const db = require('./db');
const crypto = require('crypto');

const MOCK_GYM_MOVES = [
    { pageIndex: 5, name: 'Bench Press', group: 'Push', imageUrl: '/gym_moves/ExerciseBook_page-0005.jpg' },
    { pageIndex: 6, name: 'Overhead Press', group: 'Push', imageUrl: '/gym_moves/ExerciseBook_page-0006.jpg' },
    { pageIndex: 10, name: 'Deadlift', group: 'Pull', imageUrl: '/gym_moves/ExerciseBook_page-0010.jpg' },
    { pageIndex: 12, name: 'Barbell Row', group: 'Pull', imageUrl: '/gym_moves/ExerciseBook_page-0012.jpg' },
    { pageIndex: 15, name: 'Squat', group: 'Legs', imageUrl: '/gym_moves/ExerciseBook_page-0015.jpg' },
];

function seed() {
    console.log('🌱 Seeding database...');

    // Clear existing data
    db.prepare('DELETE FROM GymSet').run();
    db.prepare('DELETE FROM GymSession').run();
    db.prepare('DELETE FROM GymExercise').run();
    db.prepare('DELETE FROM GymPlan').run();
    db.prepare('DELETE FROM GymMoveReference').run();
    db.prepare('DELETE FROM StudySession').run();
    db.prepare('DELETE FROM ExamTopic').run();
    db.prepare('DELETE FROM Exam').run();
    db.prepare('DELETE FROM Task').run();

    // 0. Gym Moves Reference
    const insertMove = db.prepare('INSERT INTO GymMoveReference (id, name, "group", pageIndex, imageUrl) VALUES (?, ?, ?, ?, ?)');
    for (const move of MOCK_GYM_MOVES) {
        insertMove.run(crypto.randomUUID(), move.name, move.group, move.pageIndex, move.imageUrl);
    }
    console.log('✅ Created Gym Moves Reference');

    // 1. Gym Data
    const planId = crypto.randomUUID();
    db.prepare('INSERT INTO GymPlan (id, dayName) VALUES (?, ?)').run(planId, 'Chest Day (Test)');

    db.prepare('INSERT INTO GymExercise (id, planId, name, targetSets, targetReps, lastWeight, lastReps) VALUES (?, ?, ?, ?, ?, ?, ?)').run('bench-press', planId, 'Bench Press', 4, 8, 100, 8);
    db.prepare('INSERT INTO GymExercise (id, planId, name, targetSets, targetReps, lastWeight, lastReps) VALUES (?, ?, ?, ?, ?, ?, ?)').run('incline-dumbbell', planId, 'Incline Dumbbell Press', 3, 10, 30, 10);
    console.log('✅ Created Gym Plan: Chest Day (Test)');

    // 2. Study Data
    const examId = crypto.randomUUID();
    db.prepare('INSERT INTO Exam (id, name, date) VALUES (?, ?, ?)').run(examId, 'Finals (Test)', '2026-06-01');

    db.prepare('INSERT INTO ExamTopic (id, examId, name, totalSessionsGoal, sessionsCompleted) VALUES (?, ?, ?, ?, 0)').run(crypto.randomUUID(), examId, 'Math', 20);
    db.prepare('INSERT INTO ExamTopic (id, examId, name, totalSessionsGoal, sessionsCompleted) VALUES (?, ?, ?, ?, 0)').run(crypto.randomUUID(), examId, 'Physics', 15);
    console.log('✅ Created Exam: Finals (Test)');

    // 3. Task Data
    const insertTask = db.prepare('INSERT INTO Task (id, title, priority, importance, completed, isMinimum, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertTask.run(crypto.randomUUID(), 'Buy Groceries (Test)', 'high', 'medium', 0, 0, null);
    insertTask.run(crypto.randomUUID(), 'Walk the Dog (Test)', 'medium', 'medium', 1, 0, null);
    insertTask.run(crypto.randomUUID(), 'Read Book (Test)', 'low', 'low', 0, 0, new Date().toISOString());
    console.log('✅ Created Tasks');

    console.log('✨ Seeding finished.');
}

try {
    seed();
} catch (e) {
    console.error('❌ Seeding failed:', e);
}
