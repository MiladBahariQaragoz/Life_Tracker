const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Initialize Google Sheets API using environment variable
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('❌ GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required');
}

console.log('🔑 Using credentials from GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Table Schema Definitions
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

// ===== CACHING LAYER =====
const cache = {
    data: new Map(),
    ttl: 5000, // 5 seconds cache TTL

    get(key) {
        const cached = this.data.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.ttl) {
            this.data.delete(key);
            return null;
        }

        return cached.value;
    },

    set(key, value) {
        this.data.set(key, {
            value,
            timestamp: Date.now()
        });
    },

    invalidate(tableNameOrPattern) {
        if (tableNameOrPattern === '*') {
            this.data.clear();
        } else {
            // Invalidate all cache keys for this table
            for (const key of this.data.keys()) {
                if (key.startsWith(tableNameOrPattern + ':')) {
                    this.data.delete(key);
                }
            }
        }
    }
};

// ===== RATE LIMITING =====
const rateLimiter = {
    queue: [],
    processing: false,
    maxRequestsPerSecond: 10,
    minDelayMs: 100, // Min 100ms between requests

    async enqueue(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    },

    async process() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const { fn, resolve, reject } = this.queue.shift();

            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                reject(error);
            }

            // Respect rate limit
            if (this.queue.length > 0) {
                await new Promise(r => setTimeout(r, this.minDelayMs));
            }
        }

        this.processing = false;
    }
};

// ===== ERROR HANDLING & RETRY =====
async function retryWithBackoff(fn, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on authentication errors
            if (error.code === 401 || error.code === 403) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, i) * 1000;
            console.log(`⚠️ Request failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw lastError;
}

// ===== HELPER FUNCTIONS =====

async function getSheetData(range) {
    return rateLimiter.enqueue(async () => {
        return retryWithBackoff(async () => {
            try {
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range,
                });
                return res.data.values || [];
            } catch (e) {
                // If sheet doesn't exist, return empty
                if (e.code === 400) return [];
                throw e;
            }
        });
    });
}

function mapRowsToObjects(rows, headers) {
    if (!rows || rows.length < 2) return [];

    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj = {};

        headers.forEach((h, index) => {
            let val = row[index];

            // Handle empty cells
            if (val === undefined || val === null || val === '') {
                obj[h] = '';
                return;
            }

            // Try to parse JSON objects/arrays
            if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                try {
                    obj[h] = JSON.parse(val);
                    return;
                } catch (e) {
                    // Not valid JSON, keep as string
                }
            }

            obj[h] = val;
        });

        data.push(obj);
    }

    return data;
}

function objectToRow(obj, headers) {
    return headers.map(h => {
        const val = obj[h];

        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);

        return String(val);
    });
}

// ===== INITIALIZATION =====

let isInitialized = false;
let initializationPromise = null;

async function initDb() {
    // If already initialized, return immediately
    if (isInitialized) {
        console.log("✅ Database already initialized, skipping...");
        return;
    }

    // If initialization is in progress, wait for it
    if (initializationPromise) {
        console.log("⏳ Database initialization in progress, waiting...");
        return initializationPromise;
    }

    // Start initialization
    initializationPromise = (async () => {
        console.log("🔄 Initializing Google Sheets DB...");

        try {
            if (!SPREADSHEET_ID) {
                throw new Error('❌ GOOGLE_SHEET_ID not set in .env file');
            }

            // Get spreadsheet metadata (single API call)
            const meta = await rateLimiter.enqueue(async () => {
                return retryWithBackoff(async () => {
                    return await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
                });
            });

            const existingTitles = meta.data.sheets.map(s => s.properties.title);

            console.log(`📊 Connected to spreadsheet: "${meta.data.properties.title}"`);
            console.log(`📄 Existing sheets: ${existingTitles.join(', ')}`);

            // Create missing sheets in a single batch
            const requests = [];
            const missingSheets = [];

            for (const [tableName, headers] of Object.entries(TABLES)) {
                if (!existingTitles.includes(tableName)) {
                    console.log(`➕ Queuing creation of sheet: ${tableName}`);
                    missingSheets.push(tableName);
                    requests.push({
                        addSheet: {
                            properties: { title: tableName }
                        }
                    });
                }
            }

            // Create all missing sheets in one API call
            if (requests.length > 0) {
                await rateLimiter.enqueue(async () => {
                    return retryWithBackoff(async () => {
                        await sheets.spreadsheets.batchUpdate({
                            spreadsheetId: SPREADSHEET_ID,
                            resource: { requests }
                        });
                    });
                });
                console.log(`✅ Created ${requests.length} new sheets`);
            }

            // Write headers only for newly created sheets (batch operation)
            const headerUpdates = [];
            for (const tableName of missingSheets) {
                const headers = TABLES[tableName];
                headerUpdates.push({
                    range: `${tableName}!A1`,
                    values: [headers]
                });
            }

            if (headerUpdates.length > 0) {
                await rateLimiter.enqueue(async () => {
                    return retryWithBackoff(async () => {
                        await sheets.spreadsheets.values.batchUpdate({
                            spreadsheetId: SPREADSHEET_ID,
                            resource: {
                                valueInputOption: 'RAW',
                                data: headerUpdates
                            }
                        });
                    });
                });
                console.log(`✏️ Wrote headers for ${headerUpdates.length} new sheets`);
            }

            // Seed Initial User if needed (only if UserXP was newly created)
            if (missingSheets.includes('UserXP')) {
                await rateLimiter.enqueue(async () => {
                    return retryWithBackoff(async () => {
                        await sheets.spreadsheets.values.append({
                            spreadsheetId: SPREADSHEET_ID,
                            range: 'UserXP!A:Z',
                            valueInputOption: 'RAW',
                            resource: { values: [['user', '0', '1']] }
                        });
                    });
                });
                console.log('👤 Created initial user with 0 XP');
            }

            isInitialized = true;
            console.log("✅ Google Sheets DB Initialized Successfully");

        } catch (e) {
            console.error("❌ InitDB Error:", e.message);
            console.error("Stack:", e.stack);
            initializationPromise = null; // Reset so it can be retried
            throw e;
        }
    })();

    return initializationPromise;
}

// ===== CRUD OPERATIONS =====

async function getAll(tableName) {
    // Check cache first
    const cacheKey = `${tableName}:all`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const rows = await getSheetData(`${tableName}!A:Z`);
    const result = mapRowsToObjects(rows, TABLES[tableName]);

    // Cache the result
    cache.set(cacheKey, result);

    return result;
}

async function insert(tableName, obj) {
    const headers = TABLES[tableName];
    const row = objectToRow(obj, headers);

    await rateLimiter.enqueue(async () => {
        return retryWithBackoff(async () => {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tableName}!A:Z`,
                valueInputOption: 'RAW',
                resource: { values: [row] }
            });
        });
    });

    // Invalidate cache
    cache.invalidate(tableName);
}

async function update(tableName, id, updates) {
    // Get all data
    const rows = await getSheetData(`${tableName}!A:Z`);
    if (!rows || rows.length < 2) return;

    const headers = TABLES[tableName];
    const idIndex = headers.indexOf('id');

    // Find row
    let rowIndex = -1;
    let currentRowData = null;

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === String(id)) {
            rowIndex = i + 1; // 1-based for Sheets API
            currentRowData = rows[i];
            break;
        }
    }

    if (rowIndex === -1) {
        console.warn(`⚠️ Update failed: ID "${id}" not found in ${tableName}`);
        return;
    }

    // Merge updates
    const newRow = headers.map((h, i) => {
        if (updates.hasOwnProperty(h)) {
            const val = updates[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
        }
        return currentRowData[i] || '';
    });

    await rateLimiter.enqueue(async () => {
        return retryWithBackoff(async () => {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tableName}!A${rowIndex}`,
                valueInputOption: 'RAW',
                resource: { values: [newRow] }
            });
        });
    });

    // Invalidate cache
    cache.invalidate(tableName);
}

async function remove(tableName, id) {
    const rows = await getSheetData(`${tableName}!A:Z`);
    const headers = TABLES[tableName];
    const idIndex = headers.indexOf('id');

    // Get sheet ID for batchUpdate
    let sheetId = null;
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = meta.data.sheets.find(s => s.properties.title === tableName);
        if (sheet) sheetId = sheet.properties.sheetId;
    } catch (e) {
        console.error('Error getting sheet ID:', e);
    }

    if (sheetId === null) {
        console.warn(`⚠️ Delete failed: Could not find sheet ID for ${tableName}`);
        return;
    }

    // Find row to delete
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === String(id)) {
            await rateLimiter.enqueue(async () => {
                return retryWithBackoff(async () => {
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
                });
            });

            // Invalidate cache
            cache.invalidate(tableName);
            return;
        }
    }

    console.warn(`⚠️ Delete failed: ID "${id}" not found in ${tableName}`);
}

// Query with filter function (in-memory)
async function query(tableName, filterFn) {
    const all = await getAll(tableName);
    return all.filter(filterFn);
}

// ===== BATCH OPERATIONS =====

async function batchInsert(tableName, objects) {
    if (!objects || objects.length === 0) return;

    const headers = TABLES[tableName];
    const rows = objects.map(obj => objectToRow(obj, headers));

    await rateLimiter.enqueue(async () => {
        return retryWithBackoff(async () => {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tableName}!A:Z`,
                valueInputOption: 'RAW',
                resource: { values: rows }
            });
        });
    });

    cache.invalidate(tableName);
    console.log(`✅ Batch inserted ${objects.length} rows into ${tableName}`);
}

// ===== HEALTH CHECK =====

async function healthCheck() {
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        return {
            status: 'healthy',
            spreadsheetTitle: meta.data.properties.title,
            sheetCount: meta.data.sheets.length,
            cacheSize: cache.data.size
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

// ===== EXPORTS =====

module.exports = {
    initDb,
    getAll,
    insert,
    update,
    remove,
    query,
    batchInsert,
    healthCheck,
    cache // Export for manual cache control if needed
};
