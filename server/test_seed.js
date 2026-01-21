const db = require('./sheetsDb');

async function seed() {
    try {
        console.log("--- STEP 1: WRITE ---");
        await db.initDb();
        const testId = 'PERSISTENCE_CHECK_abc123';
        console.log(`Inserting Task ID: ${testId}`);
        await db.insert('Task', {
            id: testId,
            title: 'Persistence Test Item',
            priority: 'high',
            importance: 'medium',
            completed: 0,
            isMinimum: 0,
            dueDate: new Date().toISOString()
        });
        console.log("✅ Insert Completed. Exiting process.");
    } catch (e) {
        console.error("❌ Insert Failed:", e);
        process.exit(1);
    }
}
seed();
