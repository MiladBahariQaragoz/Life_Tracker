const db = require('./db');
const crypto = require('crypto');

const movesData = [
    { pageIndex: 6, name: "Bench Press", group: "Chest" },
    { pageIndex: 7, name: "Cable Bench Press", group: "Chest" },
    { pageIndex: 8, name: "Converging Bench Press", group: "Chest" },
    { pageIndex: 9, name: "Incline Bench Press", group: "Chest" },
    { pageIndex: 10, name: "Cable Incline Bench Press", group: "Chest" },
    { pageIndex: 11, name: "Converging Incline Press", group: "Chest" },
    { pageIndex: 12, name: "Decline Bench Press", group: "Chest" },
    { pageIndex: 13, name: "Cable Decline Bench Press", group: "Chest" },
    { pageIndex: 14, name: "Converging Decline Bench Press", group: "Chest" },
    { pageIndex: 15, name: "Self Stabilizing Chest Press", group: "Chest" },
    { pageIndex: 16, name: "Cable Pec Fly", group: "Chest" },
    { pageIndex: 17, name: "Cable Incline Fly", group: "Chest" },
    { pageIndex: 18, name: "Cable Low Fly", group: "Chest" },
    { pageIndex: 20, name: "Shoulder Press", group: "Shoulders" },
    { pageIndex: 21, name: "Cable Shoulder Press", group: "Shoulders" },
    { pageIndex: 22, name: "Converging Shoulder Press", group: "Shoulders" },
    { pageIndex: 23, name: "Cable Lateral Raise", group: "Shoulders" },
    { pageIndex: 24, name: "Cable Front Raise", group: "Shoulders" },
    { pageIndex: 25, name: "Standing Cable Lateral Raise", group: "Shoulders" },
    { pageIndex: 26, name: "Standing Front Raise", group: "Shoulders" },
    { pageIndex: 27, name: "Upright Row", group: "Shoulders" },
    { pageIndex: 28, name: "Shrugs", group: "Shoulders" },
    { pageIndex: 29, name: "External Rotator", group: "Shoulders" },
    { pageIndex: 30, name: "Internal Rotator", group: "Shoulders" },
    { pageIndex: 32, name: "Lat Pull Down", group: "Back" },
    { pageIndex: 33, name: "Low Cable Row", group: "Back" },
    { pageIndex: 34, name: "Mid Row", group: "Back" },
    { pageIndex: 35, name: "One Arm Row", group: "Back" },
    { pageIndex: 36, name: "Front Lat Pullover", group: "Back" },
    { pageIndex: 37, name: "Seated Cable Mid Row", group: "Back" },
    { pageIndex: 38, name: "Self Stabilizing Mid Row", group: "Back" },
    { pageIndex: 40, name: "Cable Arm Curl", group: "Arms" },
    { pageIndex: 41, name: "Standing Bar Curl", group: "Arms" },
    { pageIndex: 42, name: "Overhead Biceps Curl", group: "Arms" },
    { pageIndex: 43, name: "Arm Curl From Mid Pulley", group: "Arms" },
    { pageIndex: 44, name: "Triceps Pushdown", group: "Arms" },
    { pageIndex: 45, name: "Triceps Extension", group: "Arms" },
    { pageIndex: 46, name: "Triceps Extension From High Pulley", group: "Arms" },
    { pageIndex: 47, name: "Triceps Kickback", group: "Arms" },
    { pageIndex: 49, name: "Ab Crunch", group: "Core" },
    { pageIndex: 50, name: "Reverse Crunch (Seated Knee Raise)", group: "Core" },
    { pageIndex: 51, name: "Oblique Twist", group: "Core" },
    { pageIndex: 52, name: "Side Bends", group: "Core" },
    { pageIndex: 54, name: "Leg Extension", group: "Legs" },
    { pageIndex: 55, name: "Standing Leg Curl", group: "Legs" },
    { pageIndex: 56, name: "Seated Leg Curl", group: "Legs" },
    { pageIndex: 57, name: "Leg Press", group: "Legs" },
    { pageIndex: 58, name: "Calf Raise", group: "Legs" },
    { pageIndex: 59, name: "Hip Adduction", group: "Legs" },
    { pageIndex: 60, name: "Hip Abduction", group: "Legs" },
    { pageIndex: 61, name: "Glute Kick", group: "Legs" }
];

async function main() {
    console.log(`Starting seed of ${movesData.length} moves...`);

    try {
        await db.initDb();

        for (const move of movesData) {
            // Check if exists to avoid duplicates
            const res = await db.query('SELECT * FROM GymMoveReference WHERE name = $1', [move.name]);
            const existing = res.rows[0];

            const imageUrl = `/gym_moves/ExerciseBook_page-00${move.pageIndex}.jpg`;

            if (existing) {
                console.log(`Update: ${move.name}`);
                await db.query(`
                    UPDATE GymMoveReference 
                    SET "group" = $1, pageIndex = $2, imageUrl = $3
                    WHERE id = $4
                `, [move.group, move.pageIndex, imageUrl, existing.id]);
            } else {
                console.log(`Create: ${move.name}`);
                // Generate simple ID from name
                const id = move.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                await db.query(`
                    INSERT INTO GymMoveReference (id, name, "group", pageIndex, imageUrl)
                    VALUES ($1, $2, $3, $4, $5)
                `, [id, move.name, move.group, move.pageIndex, imageUrl]);
            }
        }
        console.log('Done!');
    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        process.exit(0);
    }
}

main();
