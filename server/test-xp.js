const { calculateGymXP, calculateStudyXP, calculateTaskXP, calculateLevel } = require('./utils/xpSystem');

console.log('--- START XP SYSTEM TESTS ---');

// 1. GYM TEST
console.log('\n[GYM] Testing Standard Session...');
const gymSession = {
    preWorkoutState: 'Energized', // 1.05
    sets: [
        { rpe: 8, restInterval: 90, targetRest: 90, weight: 100, reps: 10, exerciseId: 'bench', feeling: '' }, // 5 * 1.2 * 1.0 = 6
        { rpe: 9, restInterval: 40, targetRest: 90, weight: 100, reps: 10, exerciseId: 'bench', feeling: 'Good' } // 5 * 1.4 * (0.85 + 0.1 = 0.95) = 6.65
    ]
};
// Overload check: Previous was 90kg, so 100kg is +10 XP
const history = {
    'bench': { lastWeight: 90, lastReps: 10 }
};

const gymResult = calculateGymXP(gymSession, history);
console.log('Result:', JSON.stringify(gymResult, null, 2));

// Expecting:
// Set 1: 6 XP
// Set 2: 6.65 XP -> Total Sets: 12.65
// Overload: 10 XP
// Base: 40
// Total Pre-Mult: 62.65
// Multiplier (Energized): x1.05 -> 65.78
// Floored: 65

// 2. STUDY TEST
console.log('\n[STUDY] Testing Exam Proximity...');
const studySession = {
    durationMinutes: 60, // sqrt(60)*4 = 7.74 * 4 = 30.98
    quality: 'Deep', // 1.4
    interruptions: 2, // penalty: min(0.1, 0.4) = 0.1 -> mult 0.9
    preSessionActivity: 'Gaming', // 0.85
    isTopicCompleted: true // +50
};
// Global Mult: 1.4 * 0.9 * 0.85 = 1.071
// Base: 20
// Duration: 31
// Total pre-bonus: (20 + 31) * 1.071 = 54.62
// Exam Bonus (<14 days): x 1.1 -> 60.08
// Topic Bonus: +50 -> 110.08

const examDetails = { date: new Date(Date.now() + 86400000 * 5).toISOString() }; // 5 days away
const studyResult = calculateStudyXP(studySession, examDetails);
console.log('Result:', JSON.stringify(studyResult, null, 2));


// 3. TASK TEST
console.log('\n[TASK] Testing Strategic Task...');
const task = {
    priority: 'High', // Load High -> 1.4
    importance: 'High' // Imp High -> 1.5
};
// Base 15 * 1.4 * 1.5 = 31.5
// Strategic Bonus +10 -> 41.5
const taskResult = calculateTaskXP(task);
console.log('Result:', JSON.stringify(taskResult, null, 2));

// 4. CAPS TEST
console.log('\n[CAPS] Testing Soft/Hard Caps...');
// Trigger massive XP
const hugeSession = {
    preWorkoutState: 'Neutral',
    sets: []
};
for (let i = 0; i < 100; i++) hugeSession.sets.push({ rpe: 10, restInterval: 90, targetRest: 90, weight: 100, reps: 10 });
// 100 sets * (5 * 1.1 * 1.0) = 550 XP + 40 Base = 590 XP.
// Cap Logic:
// > 350.
// 250 (free)
// + (100 * 0.5) = 50 (for 250-350 range)
// + (240 * 0.2) = 48 (for 350-590 range)
// Total expected: 250 + 50 + 48 = 348.

const capResult = calculateGymXP(hugeSession);
console.log(`Raw XP ~590. Result: ${capResult.totalXP}. Caps:`, capResult.capsApplied);

// 5. LEVEL CURVE
console.log('\n[LEVEL] Testing Curve...');
const l1 = calculateLevel(0);
const l2 = calculateLevel(150);
console.log('0 XP:', l1);
console.log('150 XP:', l2);
