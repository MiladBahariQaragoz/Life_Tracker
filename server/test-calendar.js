const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load root .env

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const KEY_FILE_PATH = path.join(__dirname, 'service-account.json');
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const fs = require('fs');
const logFile = path.join(__dirname, 'debug_output.txt');

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function test() {
    fs.writeFileSync(logFile, '--- Testing Calendar Integration ---\n');
    log(`Calendar ID: ${CALENDAR_ID}`);
    log(`Key File: ${KEY_FILE_PATH}`);

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: SCOPES,
        });
        const calendar = google.calendar({ version: 'v3', auth });

        // 1. Try to WRITE
        log('\n[1] Attempting to WRITE test event...');
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 60000); // 30 mins later

        try {
            const insertRes = await calendar.events.insert({
                calendarId: CALENDAR_ID,
                requestBody: {
                    summary: 'Antigravity Connectivity Test ' + now.toLocaleTimeString(),
                    description: 'Automated test event',
                    start: { dateTime: now.toISOString() },
                    end: { dateTime: end.toISOString() }
                }
            });
            log('✅ WRITE SUCCESS. Event ID: ' + insertRes.data.id);
        } catch (e) {
            log('❌ WRITE FAILED: ' + e.message);
            // If write fails, we might not have permission, but try read anyway
        }

        // 2. Try to READ (List events for today)
        log('\n[2] Attempting to READ events...');
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        try {
            const listRes = await calendar.events.list({
                calendarId: CALENDAR_ID,
                timeMin: startOfDay,
                timeMax: endOfDay,
                singleEvents: true,
                orderBy: 'startTime',
            });

            log(`✅ READ SUCCESS. Found ${listRes.data.items.length} events.`);
            listRes.data.items.forEach(item => {
                log(`   - [${item.start.dateTime || item.start.date}] ${item.summary}`);
            });

        } catch (e) {
            log('❌ READ FAILED: ' + e.message);
        }

    } catch (e) {
        log('CRITICAL ERROR: ' + e.toString());
    }
}

test();
