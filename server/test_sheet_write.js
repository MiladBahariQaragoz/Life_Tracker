const db = require('./sheetsDb');

async function testWrite() {
    try {
        console.log("Initializing DB...");
        await db.initDb();
        console.log("DB Init Success.");

        const testId = `test-${Date.now()}`;
        console.log(`Inserting test task: ${testId}`);
        await db.insert('Task', {
            id: testId,
            title: 'Test Write Operation',
            priority: 'low',
            importance: 'medium',
            completed: 0,
            isMinimum: 0,
            dueDate: new Date().toISOString()
        });
        console.log("Insert Success.");

        console.log("Verifying Insert...");
        const tasks = await db.getAll('Task');
        const found = tasks.find(t => t.id === testId);

        if (found) {
            console.log("✅ Read Verification Success: Found inserted item.");
        } else {
            console.error("❌ Read Verification Failed: Item not found.");
            process.exit(1);
        }

        console.log("Deleting test task...");
        await db.remove('Task', testId);
        console.log("Delete Success.");
        console.log("✅ WRITE TEST COMPLETED SUCCESSFULLY");
    } catch (e) {
        console.error("❌ WRITE TEST FAILED:", e);
        process.exit(1);
    }
}

testWrite();
