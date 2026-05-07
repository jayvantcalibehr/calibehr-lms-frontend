import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Courses      from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Quiz         from './pages/Quiz';
import QuizTake     from './pages/QuizTake';      // NEW: public quiz page
import InterviewTake from './pages/InterviewTake'; // NEW: public interview recording page
import Interview    from './pages/Interview';
import Leaderboard  from './pages/Leaderboard';
import Reports      from './pages/Reports';
import Settings     from './pages/Settings';

/* ── Admin / management pages ── */
import AdminCategories from './pages/admin/AdminCategories';
import AdminCourses    from './pages/admin/AdminCourses';

import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ──────────── PUBLIC ROUTES (no login required) ──────────── */}
        <Route path="/login" element={<Login />} />

        {/* Public quiz invite link — recipient takes quiz from email link */}
        <Route path="/quiz-take/:inviteId" element={<QuizTake />} />

        {/* Public interview invite link — recipient records video answers */}
        <Route path="/interview-take/:uniqueId" element={<InterviewTake />} />

        {/* ──────────── LOGGED-IN ROUTES ──────────── */}
        <Route path="/dashboard"
               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/courses"
               element={<ProtectedRoute permission="courses.view"><Courses /></ProtectedRoute>} />
        <Route path="/courses/:courseId"
               element={<ProtectedRoute permission="courses.view"><CourseDetail /></ProtectedRoute>} />

        {/* Quiz tab — Admin / Quiz Master / HR Recruiter only (matches old project) */}
        <Route path="/quiz"
               element={<ProtectedRoute permission="quiz.manage"><Quiz /></ProtectedRoute>} />

        {/* Interview tab — Admin / Interviewer / HR Recruiter only (matches old project) */}
        <Route path="/interview"
               element={<ProtectedRoute permission="interview.manage"><Interview /></ProtectedRoute>} />

        <Route path="/leaderboard"
               element={<ProtectedRoute permission="leaderboard.view"><Leaderboard /></ProtectedRoute>} />

        {/* Reports — Admin only */}
        <Route path="/reports"
               element={<ProtectedRoute><Reports /></ProtectedRoute>} />

        <Route path="/settings"
               element={<ProtectedRoute permission="settings.own"><Settings /></ProtectedRoute>} />

        {/* Management routes (permission-gated) */}
        <Route path="/admin/categories"
               element={<ProtectedRoute permission="categories.manage"><AdminCategories /></ProtectedRoute>} />
        <Route path="/admin/courses"
               element={<ProtectedRoute permission="courses.manage"><AdminCourses /></ProtectedRoute>} />

        {/* NOTE:
            /admin/quizzes, /admin/interviews, /admin/candidates, /admin/learners, /admin/users
            were removed — those features are handled inline on /quiz, /interview and /admin/courses
            via role-based dual-view. User role management is in /settings → User Management
            (Admin-only tab). */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
