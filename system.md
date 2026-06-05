# Life Tracker - System Documentation

## Architecture Overview
Life Tracker is a full-stack web application designed to help users track their gym workouts, study sessions, and daily tasks with built-in AI assistance and gamification elements.

- **Frontend:** React, TypeScript, Tailwind CSS, Vite, Recharts, React Router
- **Backend:** Node.js, Express.js
- **Database:** Google Sheets API (`sheetsService.js`) acting as the primary database with a caching and rate-limiting layer. There is also a PostgreSQL adapter (`db.js`) which might be used as an alternative or legacy setup.
- **AI Integration:** Google Gemini AI (`@google/generative-ai`) used for AI coaching and generating workout schedules.
- **Calendar Sync:** Google Calendar API integration for syncing tasks and events.

## Data Models (Google Sheets)
The backend dynamically maps Google Sheets to the following schemas:

1. **GymPlan:** `id`, `dayName`
2. **GymExercise:** `id`, `planId`, `name`, `targetSets`, `targetReps`, `lastWeight`, `lastReps`
3. **GymSession:** `id`, `workoutPlanId`, `startTime`, `endTime`, `preWorkoutState`, `xp`, `xpBreakdown`, `date`
4. **GymSet:** `id`, `sessionId`, `exerciseId`, `weight`, `reps`, `rpe`, `restInterval`, `feeling`
5. **GymWeeklySchedule:** `id`, `date`, `planId`, `isDone`
6. **GymMoveReference:** `id`, `name`, `group`, `pageIndex`, `imageUrl`
7. **Exam:** `id`, `name`, `date`
8. **ExamTopic:** `id`, `examId`, `name`, `totalSessionsGoal`, `sessionsCompleted`
9. **StudySession:** `id`, `topicId`, `quality`, `startTime`, `endTime`, `environment`, `interruptions`, `preSessionActivity`, `xp`, `xpBreakdown`
10. **Task:** `id`, `title`, `priority`, `importance`, `completed`, `isMinimum`, `dueDate`, `calendarEventId`
11. **UserXP:** `id`, `totalXP`, `level`

## Key Features
1. **Gym Tracking:** Users can create templates, add exercises from a pre-defined list, log sets, track progressive overload, and auto-generate weekly schedules via Gemini AI.
2. **Study Planning:** Track exams, break them down into topics, set session goals, and log study sessions. Progress is visualized in the dashboard.
3. **Task Matrix:** An Eisenhower-style matrix for tracking tasks based on priority (cognitive load) and importance.
4. **Dashboard & Analytics:** Overview of daily tasks, upcoming exams, and workout plans. Includes Recharts-based components for Productivity Heatmap, Topic Mastery Radar, and Volume Progression.
5. **AI Coach:** Users can communicate their mood and receive tailored AI advice based on their current tasks and schedule.
6. **XP System:** Backend logic calculates XP for gym sets (based on RPE and rest), study sessions (duration and quality), and tasks. Note: The frontend currently runs in a "safe mode" where XP is visually disabled by user request.

## Project Structure
- `src/`: React frontend code
  - `components/`: UI components like `Layout.tsx`, `AiCoachModal.tsx`, `SystemLog.tsx`, and analytics charts.
  - `context/`: `store.tsx` handles global state and API interactions. `UserStatsContext.tsx` manages local XP state.
  - `pages/`: Page components for Dashboard, Gym, Study, Tasks, and Detail views.
  - `lib/`: `api.ts` configured to connect to the backend, `utils.ts` for Tailwind merge.
- `server/`: Node.js Express backend
  - `index.js`: Main Express server, API routing, Gemini AI setup.
  - `sheetsService.js`: Advanced Google Sheets wrapper acting as the ORM with rate-limiting and caching.
  - `utils/xpSystem.js`: Core gamification logic.
  - Additional utility scripts for seeding and migrating data.
- `backend/`: Legacy or alternative Google Apps Script (`Code.js`).

## Environment Variables Needed
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Credentials for Google API access
- `GOOGLE_SHEET_ID`: Spreadsheet ID for database
- `GOOGLE_CALENDAR_ID`: Target calendar for syncing events
- `GEMINI_API_KEY`: For AI features
- `PORT`: Server port (default 3000)
