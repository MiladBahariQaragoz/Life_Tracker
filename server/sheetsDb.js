const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const CREDENTIALS_PATH = path.join(__dirname, 'service-account.json');
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const TABLES = {
    GymPlan: ['id', 'dayName'],
    GymExercise: ['id', 'planId', 'name', 'targetSets', 'targetReps', 'lastWeight', 'lastReps'],
    GymSession: ['id', 'workoutPlanId', 'startTime', 'endTime', 'preWorkoutState', 'xp', 'xpBreakdown', 'date'],
    GymWeeklySchedule: ['id', 'date', 'planId', 'isDone'],
    GymSet: ['id', 'sessionId', 'exerciseId', 'weight', 'reps', 'rpe', 'restInterval', 'feeling'],
    GymMoveReference: ['id', 'name', 'group', 'pageIndex', 'imageUrl'],
    Exam: ['id', 'name', 'date'],
    ExamTopic: ['id', 'examId', 'name', 'totalSessionsGoal', 'sessionsCompleted'],
    StudySession: ['id', 'topicId', 'quality', 'startTime', 'endTime', 'environment', 'interruptions', 'preSessionActivity', 'xp', 'xpBreakdown'],
    Task: ['id', 'title', 'priority', 'importance', 'completed', 'isMinimum', 'dueDate', 'calendarEventId'],
    UserXP: ['id', 'totalXP', 'level']
};

// --- HELPER FUNC ---
const getSheetData = async (range) => {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        return res.data.values || [];
    } catch (e) {
        // If sheet doesn't exist, return empty
        return [];
    }
};

const mapRowsToObjects = (rows, headers) => {
    if (!rows || rows.length < 2) return [];
    // Assume row 0 is headers, but we enforced headers in TABLES def.
    // Use stored headers to ensure type safety if needed, 
    // but better to use the file's headers if they match.
    const fileHeaders = rows[0];
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj = {};
        headers.forEach((h, index) => {
            let val = row[index];
            // Basic type casting (very crude)
            if (val && !isNaN(val) && val.trim() !== '') {
                // Keep as string if ID, convert if number? 
                // Sheets returns everything as strings usually.
                // We'll parse in the app logic or here. 
                // For now, keep as string/raw to emulate DB returns mostly strings for bigints etc.
            }
            obj[h] = val;
        });
        data.push(obj);
    }
    return data;
};

// --- CRUD ---

const initDb = async () => {
    console.log("Initializing Google Sheets DB...");
    // Check if sheets exist, if not create them with headers
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingTitles = meta.data.sheets.map(s => s.properties.title);

        const requests = [];

        for (const [tableName, headers] of Object.entries(TABLES)) {
            if (!existingTitles.includes(tableName)) {
                console.log(`Creating sheet: ${tableName}`);
                requests.push({
                    addSheet: {
                        properties: { title: tableName }
                    }
                });
            }
        }

        if (requests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: { requests }
            });
        }

        // Now verify headers (simple check: write them if row 1 is empty)
        // We do this serially to avoid rate limits
        for (const [tableName, headers] of Object.entries(TABLES)) {
            const data = await getSheetData(`${tableName}!A1:Z1`);
            if (!data || data.length === 0) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${tableName}!A1`,
                    valueInputOption: 'RAW',
                    resource: { values: [headers] }
                });
                console.log(`wrote headers for ${tableName}`);
            }
        }

        // Seed Initial User
        const userData = await getSheetData('UserXP!A:Z');
        if (!userData || userData.length < 2) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'UserXP!A:Z',
                valueInputOption: 'RAW',
                resource: { values: [['user', '0', '1']] }
            });
        }

        console.log("✅ Google Sheets DB Initialized");

    } catch (e) {
        console.error("InitDB Error:", e);
    }
};

const getAll = async (tableName) => {
    const rows = await getSheetData(`${tableName}!A:Z`);
    return mapRowsToObjects(rows, TABLES[tableName]);
};

const insert = async (tableName, obj) => {
    // Map object to array based on headers
    const headers = TABLES[tableName];
    const row = headers.map(h => {
        const val = obj[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    });

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tableName}!A:Z`,
        valueInputOption: 'RAW',
        resource: { values: [row] }
    });
};

const update = async (tableName, id, updates) => {
    // 1. Get all data
    const rows = await getSheetData(`${tableName}!A:Z`);
    if (!rows || rows.length < 2) return;

    const headers = TABLES[tableName];
    const idIndex = headers.indexOf('id');

    // Find row index (1-based because sheet, +1 for 0-index array logic)
    // rows[0] is header. rows[1] is data aka Range A2.
    let rowIndex = -1;
    let currentRowData = null;

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === String(id)) {
            rowIndex = i + 1; // 1-based index for Sheet API
            currentRowData = rows[i];
            break;
        }
    }

    if (rowIndex === -1) return; // Not found

    // Merge updates
    const newRow = headers.map((h, i) => {
        if (updates.hasOwnProperty(h)) {
            const val = updates[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
        }
        return currentRowData[i];
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tableName}!A${rowIndex}`,
        valueInputOption: 'RAW',
        resource: { values: [newRow] }
    });
};

const remove = async (tableName, id) => {
    // Deleting rows in Sheets is hard (indexes shift). 
    // Easier strategy: Find row, clear it? Or use batchUpdate deleteDimension.
    // batchUpdate is better.

    const rows = await getSheetData(`${tableName}!A:Z`);
    const headers = TABLES[tableName];
    const idIndex = headers.indexOf('id');

    let sheetId = null;
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = meta.data.sheets.find(s => s.properties.title === tableName);
        if (sheet) sheetId = sheet.properties.sheetId;
    } catch (e) { }

    if (sheetId === null) return;

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === String(id)) {
            // Delete this row. i is array index. Row index is i. (Array index 1 = Row 2).
            // deleteDimension startIndex is inclusive (0-based). Row 1 is index 0. Row 2 is index 1.
            // So if i=1 (Row 2), startIndex is 1.

            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: "ROWS",
                                startIndex: i,
                                endIndex: i + 1
                            }
                        }
                    }]
                }
            });
            return; // Assume unique ID, done
        }
    }
};

// Query Helper for complex logic (filter/sort) - done in memory for small apps
const query = async (tableName, filterFn) => {
    const all = await getAll(tableName);
    return all.filter(filterFn);
};

module.exports = {
    initDb,
    getAll,
    insert,
    update,
    remove,
    query
};
