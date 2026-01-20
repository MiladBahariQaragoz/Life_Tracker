const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// 1. Load Environment
console.log('--- STARTING DIAGNOSIS ---');
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const calendarId = process.env.GOOGLE_CALENDAR_ID;
console.log(`[ENV] GOOGLE_CALENDAR_ID: ${calendarId ? 'FOUND (' + calendarId + ')' : 'MISSING'}`);

// 2. Check Credentials
const credPath = path.join(__dirname, 'service-account.json');
try {
    if (fs.existsSync(credPath)) {
        console.log('[FILE] service-account.json: FOUND');
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        console.log(`[FILE] Client Email: ${creds.client_email}`);
    } else {
        console.error('[FILE] service-account.json: NOT FOUND');
        process.exit(1);
    }
} catch (e) {
    console.error(`[FILE] Error reading creds: ${e.message}`);
}

// 3. Attempt Auth & List
async function run() {
    try {
        console.log('[AUTH] Initiating GoogleAuth...');
        const auth = new google.auth.GoogleAuth({
            keyFile: credPath,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        const calendar = google.calendar({ version: 'v3', auth });

        console.log('[API] Listing events...');
        const now = new Date();
        const response = await calendar.events.list({
            calendarId: calendarId || 'primary',
            timeMin: now.toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        console.log(`[API] SUCCESS! Found ${response.data.items.length} upcoming events.`);
        if (response.data.items.length > 0) {
            response.data.items.forEach(evt => {
                console.log(`   - ${evt.summary} (${evt.start.dateTime || evt.start.date})`);
            });
        }

    } catch (e) {
        console.error('\n[API] FAILURE.');
        console.error('Error Code:', e.code);
        console.error('Error Message:', e.message);
        if (e.response) {
            console.error('API Response:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

run();
