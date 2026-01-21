const db = require('./sheetsDb');

async function verify() {
    try {
        console.log("--- STEP 2: RELOAD & READ ---");
        await db.initDb();

        console.log("Fetching all tasks from Google Sheets...");
        const tasks = await db.getAll('Task');
        console.log(`Fetched ${tasks.length} tasks.`);

        const testId = 'PERSISTENCE_CHECK_abc123';
        const found = tasks.find(t => t.id === testId);

        if (found) {
            console.log("✅ SUCCESS: Found the persisted item!");
            console.log("Item Details:", JSON.stringify(found));

            console.log("Cleaning up...");
            await db.remove('Task', testId);
            console.log("Cleanup Done.");
        } else {
            console.error("❌ FAILURE: Item NOT found after reload.");
            console.log("Current IDs:", tasks.map(t => t.id));
            process.exit(1);
        }
    } catch (e) {
        console.error("❌ Verification Failed:", e);
        process.exit(1);
    }
}
verify();
