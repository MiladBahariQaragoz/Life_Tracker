import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserStatsProvider } from './context/UserStatsContext';
import { StoreProvider } from './context/store';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { GymPage } from './pages/GymPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { StudyPage } from './pages/StudyPage';
import { ExamDetailPage } from './pages/ExamDetailPage';
import { TasksPage } from './pages/TasksPage';

function App() {
  console.log('APP COMPONENT RENDERING');
  return (
    <UserStatsProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="gym" element={<GymPage />} />
              <Route path="gym/:planId/:exerciseId" element={<ExerciseDetailPage />} />
              <Route path="study" element={<StudyPage />} />
              <Route path="study/:examId" element={<ExamDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </UserStatsProvider>
  );
}

export default App;
