const fs = require('fs');
const path = require('path');
const db = require('./db');

const CSV_PATH = path.join(__dirname, '..', 'moves.csv');

function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    // Skip header
    const data = [];
    // Header is usually line 0: Page,Move Name,Group
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',');
        if (parts.length < 3) continue;

        // Page often has a colon like "06:", remove non-digits
        // Or specific logic: user file has "06:", "07:", etc.
        let pageStr = parts[0].replace(/[^0-9]/g, '');
        const pageIndex = parseInt(pageStr, 10);

        const name = parts[1].trim();
        const group = parts[2].trim();

        if (!name || isNaN(pageIndex)) continue;

        data.push({ pageIndex, name, group });
    }
    return data;
}

function updateMoves() {
    try {
        console.log(`Reading CSV from ${CSV_PATH}...`);
        const content = fs.readFileSync(CSV_PATH, 'utf-8');
        const moves = parseCSV(content);

        console.log(`Found ${moves.length} moves. Updating database...`);

        // Transaction: Delete all, then insert new
        const transaction = db.transaction((moves) => {
            db.prepare('DELETE FROM GymMoveReference').run();
            console.log('Cleared existing moves.');

            const insertStmt = db.prepare(`
                INSERT INTO GymMoveReference (id, name, "group", pageIndex, imageUrl)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const move of moves) {
                const id = move.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const imageUrl = `/gym_moves/ExerciseBook_page-${String(move.pageIndex).padStart(4, '0')}.jpg`;
                insertStmt.run(id, move.name, move.group, move.pageIndex, imageUrl);
            }
        });

        transaction(moves);


        transaction(moves);
        console.log('Successfully updated Gym Moves.');

    } catch (e) {
        console.error('Error updating moves:', e);
    }
}

updateMoves();
