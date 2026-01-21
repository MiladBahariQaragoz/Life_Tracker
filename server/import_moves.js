const fs = require('fs');
const path = require('path');
const db = require('./sheetsService');

// Parse CSV file
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Skip header row
    const dataLines = lines.slice(1);

    const moves = [];
    for (const line of dataLines) {
        // Simple CSV parsing (handles basic cases)
        const parts = line.split(',').map(p => p.trim());

        if (parts.length >= 3) {
            const [name, group, pageIndex] = parts;

            // Generate ID from name
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            moves.push({
                id,
                name,
                group,
                pageIndex: parseInt(pageIndex) || 0,
                imageUrl: '' // No images in CSV
            });
        }
    }

    return moves;
}

async function importMoves() {
    try {
        console.log('🔄 Starting gym moves import...');

        // Initialize database first
        await db.initDb();

        // Parse CSV
        const csvPath = path.join(__dirname, '..', 'moves.csv');
        console.log(`📄 Reading moves from: ${csvPath}`);

        const moves = parseCSV(csvPath);
        console.log(`✅ Parsed ${moves.length} moves from CSV`);

        // Get existing moves to avoid duplicates
        const existingMoves = await db.getAll('GymMoveReference');
        const existingIds = new Set(existingMoves.map(m => m.id));

        // Filter out duplicates
        const newMoves = moves.filter(m => !existingIds.has(m.id));

        if (newMoves.length === 0) {
            console.log('ℹ️  All moves already exist in database');
            return;
        }

        console.log(`➕ Importing ${newMoves.length} new moves...`);

        // Batch insert all moves
        await db.batchInsert('GymMoveReference', newMoves);

        console.log('✅ Import complete!');
        console.log(`📊 Total moves in database: ${existingMoves.length + newMoves.length}`);

        // Show some examples
        console.log('\nExample moves imported:');
        newMoves.slice(0, 5).forEach(m => {
            console.log(`  - ${m.name} (${m.group})`);
        });

        process.exit(0);

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run import
importMoves();
