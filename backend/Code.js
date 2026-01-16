/**
 * LIFE TRACKER BACKEND
 * Google Apps Script
 * 
 * INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Run the 'setup' function once to create the necessary sheets.
 * 5. Deploy as Web App:
 *    - Description: "v1"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (or "Anyone with Google Account" if you prefer auth)
 * 6. Copy the Deployment URL to the frontend.
 */

// --- CONFIGURATION ---
const SCRIPT_PROP = PropertiesService.getScriptProperties();
const SHEETS = {
  GYM_PLANS: 'Gym_WeeklyPlan',
  GYM_EXERCISES: 'Gym_Exercises',
  GYM_SESSIONS: 'Gym_Sessions',
  EXAMS: 'Exams',
  EXAM_TOPICS: 'Exam_Topics',
  STUDY_SESSIONS: 'Study_Sessions',
  TASKS: 'Tasks',
  GYM_MOVES: 'Gym_moves'
};

// --- INITIAL SETUP ---
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Define Schemas [Header Row]
  const schemas = {
    [SHEETS.GYM_PLANS]: ['id', 'day_name', 'exercise_ids'], // exercise_ids is comma-separated
    [SHEETS.GYM_EXERCISES]: ['id', 'name', 'target_sets', 'target_reps'],
    [SHEETS.GYM_SESSIONS]: ['iso_timestamp', 'plan_id', 'exercise_id', 'weight', 'reps', 'feeling'],
    [SHEETS.EXAMS]: ['id', 'name', 'date'],
    [SHEETS.EXAM_TOPICS]: ['id', 'exam_id', 'name', 'total_sessions_goal'],
    [SHEETS.STUDY_SESSIONS]: ['iso_timestamp', 'exam_id', 'topic_id', 'quality'],
    [SHEETS.STUDY_SESSIONS]: ['iso_timestamp', 'exam_id', 'topic_id', 'quality'],
    [SHEETS.TASKS]: ['id', 'title', 'priority', 'completed', 'is_minimum', 'due_date', 'calendar_event_id'],
    [SHEETS.GYM_MOVES]: ['page_index', 'move_name', 'group_name'] // page_index, move_name, group_name
  };

  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      // Freeze header
      sheet.setFrozenRows(1);
    }
  });

  // Seed initial data if empty
  seedData(ss);
}

function seedData(ss) {
  const gymPlanSheet = ss.getSheetByName(SHEETS.GYM_PLANS);
  if (gymPlanSheet.getLastRow() === 1) {
    gymPlanSheet.appendRow(['push-1', 'Push A', 'bp,ohp,lat-raise']);
    gymPlanSheet.appendRow(['pull-1', 'Pull A', 'dl,row']);
  }

  const exerciseSheet = ss.getSheetByName(SHEETS.GYM_EXERCISES);
  if (exerciseSheet.getLastRow() === 1) {
    exerciseSheet.appendRow(['bp', 'Bench Press', 3, 8]);
    exerciseSheet.appendRow(['ohp', 'Overhead Press', 3, 10]);
    exerciseSheet.appendRow(['lat-raise', 'Lateral Raises', 4, 15]);
    exerciseSheet.appendRow(['dl', 'Deadlift', 3, 5]);
    exerciseSheet.appendRow(['row', 'Barbell Row', 3, 10]);
  }

  const examSheet = ss.getSheetByName(SHEETS.EXAMS);
  if (examSheet.getLastRow() === 1) {
    examSheet.appendRow(['calc', 'Calculus II', '2026-03-15']);
  }

  const topicSheet = ss.getSheetByName(SHEETS.EXAM_TOPICS);
  if (topicSheet.getLastRow() === 1) {
    topicSheet.appendRow(['t1', 'calc', 'Integration Techniques', 8]);
  }
}

// --- API HANDLING ---

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter;
    const route = params.route;

    // Parse body if POST
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) { }
    }

    let result = {};

    switch (route) {
      case 'init':
        result = getInitData();
        break;
      case 'debug':
        result = getDebugInfo();
        break;
      // GYM
      case 'gym/log':
        result = logGymSession(data);
        break;
      case 'gym/create_plan':
        result = createGymPlan(data);
        break;
      case 'gym/delete_plan':
        result = deleteGymPlan(data);
        break;
      case 'gym/add_exercise_to_plan':
        result = addExerciseToPlan(data);
        break;
      // STUDY
      case 'study/log':
        result = logStudySession(data);
        break;
      case 'study/create_exam':
        result = createExam(data);
        break;
      case 'study/delete_exam':
        result = deleteExam(data);
        break;
      case 'study/create_topic':
        result = createTopic(data);
        break;
      case 'study/delete_topic':
        result = deleteTopic(data);
        break;
      // TASKS
      case 'tasks/create':
        result = createTask(data);
        break;
      case 'tasks/update':
        result = updateTask(data);
        break;
      case 'tasks/delete':
        result = deleteTask(data);
        break;
      default:
        result = { error: 'Invalid route' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- CONTROLLERS ---

function getInitData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Get Gym Plans
  const plans = getData(ss, SHEETS.GYM_PLANS).map(row => ({
    id: row.id,
    dayName: row.day_name,
    exercises: [] // Will populate
  }));

  // 2. Get Exercises
  const allExercises = getData(ss, SHEETS.GYM_EXERCISES);
  const exMap = {};
  allExercises.forEach(ex => exMap[ex.id] = ex);


  // 3. Get Last Recorded Stats (Heavy operation, simplified)
  // Get last 500 sessions to find latest for each exercise
  const sessions = getData(ss, SHEETS.GYM_SESSIONS, 500, true); // true = reverse order
  const statsMap = {}; // exerciseId -> { weight, reps }

  sessions.forEach(sess => {
    if (!statsMap[sess.exercise_id]) {
      statsMap[sess.exercise_id] = { weight: Number(sess.weight), reps: Number(sess.reps) };
    }
  });

  // Hydrate Plans
  plans.forEach(plan => {
    const exIds = String(plan.exercise_ids || '').split(',').filter(id => id.trim().length > 0);
    plan.exercises = exIds.map(id => {
      const idTrim = id.trim();
      const exBase = exMap[idTrim] || { name: 'Unknown', target_sets: 0, target_reps: 0 };
      const stats = statsMap[idTrim] || { weight: 0, reps: 0 };

      return {
        id: idTrim,
        name: exBase.name,
        targetSets: Number(exBase.target_sets),
        targetReps: Number(exBase.target_reps),
        lastWeight: stats.weight,
        lastReps: stats.reps
      };
    });
    delete plan.exercise_ids; // Clean up
  });

  // 4. Exams & Topics
  const examsRaw = getData(ss, SHEETS.EXAMS);
  const topicsRaw = getData(ss, SHEETS.EXAM_TOPICS);
  const studySessions = getData(ss, SHEETS.STUDY_SESSIONS); // To count completed

  // Count sessions per topic
  const topicCounts = {};
  studySessions.forEach(s => {
    topicCounts[s.topic_id] = (topicCounts[s.topic_id] || 0) + 1;
  });

  const exams = examsRaw.map(e => ({
    id: e.id,
    name: e.name,
    date: e.date,
    topics: topicsRaw.filter(t => t.exam_id === e.id).map(t => ({
      id: t.id,
      name: t.name,
      totalSessionsInitial: Number(t.total_sessions_goal),
      sessionsCompleted: topicCounts[t.id] || 0
    }))
  }));

  // 5. Tasks
  const tasks = getData(ss, SHEETS.TASKS).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    completed: t.completed === 'TRUE',
    isMinimum: t.is_minimum === 'TRUE',
    dueDate: t.due_date || '', // Fixed field name
    calendarEventId: t.calendar_event_id || ''
  }));

  // 6. Gym Moves (Available for selection)
  // User specified: Col 1 = Page Index, Col 2 = Move Name, Col 3 = Group
  const movesSheet = ss.getSheetByName(SHEETS.GYM_MOVES);
  let gymMoves = [];
  if (movesSheet && movesSheet.getLastRow() > 1) {
    const dataRange = movesSheet.getRange(2, 1, movesSheet.getLastRow() - 1, 3);
    const dataValues = dataRange.getValues();
    gymMoves = dataValues.map(row => {
      let pageIdx = parseInt(String(row[0]).replace(/[^0-9]/g, ''), 10);
      if (isNaN(pageIdx)) pageIdx = 1;

      const moveName = String(row[1]).trim();

      let group = 'Other';
      if (pageIdx < 19) group = 'Chest';
      else if (pageIdx < 31) group = 'Shoulder';
      else if (pageIdx < 48) group = 'Arm';
      else if (pageIdx < 53) group = 'Core';
      else if (pageIdx <= 62) group = 'Legs';

      return {
        pageIndex: pageIdx,
        name: moveName,
        group: group
      };
    }).filter(m => m.name && m.name.length > 0);
  }

  return { gymPlans: plans, exams, tasks, gymMoves };
}

function logGymSession(data) {
  // 1. Log Session
  // { exerciseId, planId, weight, reps, feeling, timestamp }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GYM_SESSIONS);

  const row = [
    data.timestamp || new Date().toISOString(),
    data.planId,
    data.exerciseId,
    data.weight,
    data.reps,
    data.feeling || ''
  ];

  sheet.appendRow(row);
  return { success: true };
}

function createGymPlan(data) {
  // { id, dayName }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GYM_PLANS);
  sheet.appendRow([data.id, data.dayName, '']);
  return { success: true };
}

function deleteGymPlan(data) {
  // { id }
  deleteRowById(SHEETS.GYM_PLANS, data.id);
  return { success: true };
}

function addExerciseToPlan(data) {
  // { planId, moveName }
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Ensure Exercise Exists in Gym_Exercises
  const exSheet = ss.getSheetByName(SHEETS.GYM_EXERCISES);
  const allExercises = getData(ss, SHEETS.GYM_EXERCISES);
  const existingEx = allExercises.find(ex => ex.name === data.moveName);

  let exerciseId = '';

  if (existingEx) {
    exerciseId = existingEx.id;
  } else {
    // Create new exercise
    exerciseId = data.moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exSheet.appendRow([exerciseId, data.moveName, 3, 10]); // Default 3x10
  }

  // 2. Add to Gym Plan
  const planSheet = ss.getSheetByName(SHEETS.GYM_PLANS);
  const planIndex = findRowIndexById(planSheet, data.planId);

  if (planIndex === -1) return { error: 'Plan not found' };

  const planRow = planSheet.getRange(planIndex, 1, 1, 3).getValues()[0];
  let currentIds = String(planRow[2] || '').trim();

  if (currentIds.length > 0) {
    currentIds += ',' + exerciseId;
  } else {
    currentIds = exerciseId;
  }

  planSheet.getRange(planIndex, 3).setValue(currentIds);

  return { success: true, exerciseId };
}

function logStudySession(data) {
  // { examId, topicId, quality, timestamp }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STUDY_SESSIONS);

  const row = [
    data.timestamp || new Date().toISOString(),
    data.examId,
    data.topicId,
    data.quality
  ];

  sheet.appendRow(row);
  return { success: true };
}

function createExam(data) {
  // { id, name, date }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.EXAMS);
  sheet.appendRow([data.id, data.name, data.date]);
  return { success: true };
}

function deleteExam(data) {
  // { id }
  deleteRowById(SHEETS.EXAMS, data.id);
  // Also clean up topics? Optional but good practice.
  // For now simple delete.
  return { success: true };
}

function createTopic(data) {
  // { id, examId, name, totalSessionsGoal }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.EXAM_TOPICS);
  sheet.appendRow([data.id, data.examId, data.name, data.totalSessionsGoal]);
  return { success: true };
}

function deleteTopic(data) {
  // { id }
  deleteRowById(SHEETS.EXAM_TOPICS, data.id);
  return { success: true };
}

// --- TASKS & CALENDAR ---

function createTask(data) {
  // { id, title, priority, completed, isMinimum, dueDate }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TASKS);

  let calendarEventId = '';

  // Create Calendar Event if due date
  if (data.dueDate) {
    try {
      const event = CalendarApp.getDefaultCalendar().createAllDayEvent(data.title, new Date(data.dueDate));
      calendarEventId = event.getId();
    } catch (e) {
      // Calendar might not be authorized or failed
      // Proceed without it but log error if possible
    }
  }

  const row = [
    data.id,
    data.title,
    data.priority,
    data.completed ? 'TRUE' : 'FALSE',
    data.isMinimum ? 'TRUE' : 'FALSE',
    data.dueDate || '',
    calendarEventId
  ];

  sheet.appendRow(row);
  return { success: true, calendarEventId };
}

function updateTask(data) {
  // { id, title, priority, completed, isMinimum, dueDate }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TASKS);

  // Find row
  const rowIndex = findRowIndexById(sheet, data.id);
  if (rowIndex === -1) return { error: 'Task not found' };

  // Read current Calendar ID
  const range = sheet.getRange(rowIndex, 1, 1, 7);
  const values = range.getValues()[0];
  let calendarEventId = values[6]; // index 6 is calendar_event_id

  // Handle Calendar Sync
  try {
    const cal = CalendarApp.getDefaultCalendar();

    if (calendarEventId) {
      if (!data.dueDate && !data.completed) {
        // If due date removed, delete event? Or keep it?
        // Let's delete it if no due date.
        try { cal.getEventById(calendarEventId).deleteEvent(); } catch (e) { }
        calendarEventId = '';
      } else if (data.dueDate) {
        // Update existing
        try {
          const event = cal.getEventById(calendarEventId);
          if (event) {
            event.setTitle(data.title);
            event.setAllDayDate(new Date(data.dueDate));
          }
        } catch (e) { }
      }
    } else if (data.dueDate && !data.completed) {
      // No ID but has due date -> Create
      const event = cal.createAllDayEvent(data.title, new Date(data.dueDate));
      calendarEventId = event.getId();
    }

    if (data.completed && calendarEventId) {
      // If completed, maybe prepend checkmark or delete?
      // Let's prepend checkmark to title
      try {
        const event = cal.getEventById(calendarEventId);
        if (event) event.setTitle("✅ " + data.title);
      } catch (e) { }
    }
  } catch (e) {
    // Ignore calendar errors
  }

  // Update Row
  const newRow = [
    data.id,
    data.title,
    data.priority,
    data.completed ? 'TRUE' : 'FALSE',
    data.isMinimum ? 'TRUE' : 'FALSE',
    data.dueDate || '',
    calendarEventId
  ];

  range.setValues([newRow]);
  return { success: true, calendarEventId };
}

function deleteTask(data) {
  // { id }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TASKS);

  const rowIndex = findRowIndexById(sheet, data.id);
  if (rowIndex !== -1) {
    // Delete Calendar Event
    const eventId = sheet.getRange(rowIndex, 7).getValue();
    if (eventId) {
      try {
        CalendarApp.getDefaultCalendar().getEventById(eventId).deleteEvent();
      } catch (e) { }
    }

    sheet.deleteRow(rowIndex);
  }
  return { success: true };
}


// --- HELPERS ---

function deleteRowById(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex);
  }
}

function findRowIndexById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  // Col 0 is ID
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}

function getData(ss, sheetName, limit, reverse) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  // Read Data
  let startRow = 2;
  let numRows = lastRow - 1;

  if (limit && numRows > limit) {
    if (reverse) {
      startRow = lastRow - limit + 1;
      numRows = limit;
    } else {
      numRows = limit;
    }
  }

  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(startRow, 1, numRows, lastCol).getValues();

  if (reverse) {
    data.reverse();
  }

  // Map to objects
  return data.map(row => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h.toString().trim()] = row[i];
    });
    return obj;
  });
}

function getDebugInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GYM_MOVES);

  if (!sheet) {
    return {
      status: 'error',
      message: `Sheet "${SHEETS.GYM_MOVES}" not found.`,
      availableSheets: ss.getSheets().map(s => s.getName())
    };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  let sample = [];
  if (lastRow > 0) {
    sample = sheet.getRange(1, 1, Math.min(lastRow, 5), Math.min(lastCol, 5)).getValues();
  }

  return {
    status: 'success',
    sheetName: SHEETS.GYM_MOVES,
    lastRow: lastRow,
    lastCol: lastCol,
    sampleData: sample
  };
}
