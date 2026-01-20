const fetch = require('node-fetch');

async function checkApi() {
    try {
        const res = await fetch('http://localhost:3001/api/init');
        const data = await res.json();
        const moves = data.gymMoves || [];
        console.log(`API returned ${moves.length} gym moves.`);
        if (moves.length > 0) {
            console.log('Sample moves:', moves.slice(0, 3).map(m => m.name));
        } else {
            console.log('No moves found in API response.');
        }
    } catch (e) {
        console.error('Failed to fetch API:', e);
    }
}

checkApi();
