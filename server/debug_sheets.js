const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const CREDENTIALS_PATH = path.join(__dirname, 'service-account.json');
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

console.log("--- DEBUGGER STARTED ---");
console.log("Sheet ID from env:", SPREADSHEET_ID);
console.log("Credentials path:", CREDENTIALS_PATH);

async function run() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        console.log("Auth Client created. Email:", client.email);

        const sheets = google.sheets({ version: 'v4', auth });

        console.log("Attempting to read metadata...");
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        console.log("✅ Connection Successful!");
        console.log("Sheet Title:", meta.data.properties.title);
        console.log("Existing Tabs:", meta.data.sheets.map(s => s.properties.title).join(", "));

        console.log("Attempting to write...");
        // Implement a safe write test
        // Check if 'DebugTab' exists, if not create
        let debugTab = meta.data.sheets.find(s => s.properties.title === 'DebugTab');
        if (!debugTab) {
            console.log("Creating DebugTab...");
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: { requests: [{ addSheet: { properties: { title: 'DebugTab' } } }] }
            });
            console.log("DebugTab created.");
        }

        console.log("Appending data...");
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'DebugTab!A:A',
            valueInputOption: 'RAW',
            resource: { values: [['Test Write', new Date().toISOString()]] }
        });
        console.log("✅ Write Successful!");

    } catch (e) {
        console.error("❌ FATAL ERROR:");
        console.error(e.message);
        if (e.response) {
            console.error("API Response Error:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

run();
