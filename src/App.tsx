import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
const Router = typeof window !== "undefined" && window.location.protocol === "file:" ? HashRouter : BrowserRouter;
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, getDashboardPath } from "@/components/ProtectedRoute";
import CyberLoader from "@/components/ui/CyberLoader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trackPageView } from "@/lib/analytics";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ParentLoginPage from "@/pages/auth/ParentLoginPage";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import ApplyPage from "@/pages/ApplyPage";
import DiscoverAdmissionPage from "@/pages/DiscoverAdmissionPage";
import AdminPrograms from "@/pages/admin/AdminPrograms";
import AdmissionHistoryPage from "@/pages/AdmissionHistoryPage";
import AdmissionChatPage from "@/pages/AdmissionChatPage";
import ResultsPortalPage from "@/pages/ResultsPortalPage";
import DownloadPage from "@/pages/DownloadPage";
import NotFound from "@/pages/NotFound";

// Teacher Pages
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherClasses from "@/pages/teacher/TeacherClasses";
import CreateClass from "@/pages/teacher/CreateClass";
import ClassDetail from "@/pages/teacher/ClassDetail";
import TeacherStudents from "@/pages/teacher/TeacherStudents";
import TeacherAttendance from "@/pages/teacher/TeacherAttendanceAnalytics";
import TeacherTakeAttendance from "@/pages/teacher/TeacherAttendance";
import TeacherCheckin from "@/pages/teacher/TeacherCheckin";
import TeacherResults from "@/pages/teacher/TeacherResults";
import StudentDetailPage from "@/pages/teacher/StudentDetail";
import TeacherAdmissions from "@/pages/teacher/TeacherAdmissions";
import TeacherHomework from "@/pages/teacher/TeacherHomework";
import StudentHomework from "@/pages/student/StudentHomework";

// Student Pages
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentClasses from "@/pages/student/StudentClasses";
import StudentClassDetail from "@/pages/student/StudentClassDetail";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentAnnouncements from "@/pages/student/StudentAnnouncements";
import StudentNotes from "@/pages/student/StudentNotes";
import StudentLearning from "@/pages/student/StudentLearning";
import StudentAI from "@/pages/student/StudentStudyBuddy";
import StudentResults from "@/pages/student/StudentResults";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTeachers from "@/pages/admin/AdminTeachers";
import AdminTeacherManagement from "@/pages/admin/AdminTeacherManagement";
import AdminTeacherDetail from "@/pages/admin/AdminTeacherDetail";
import AdminStudentDetail from "@/pages/admin/AdminStudentDetail";
import AdminCheckinDashboard from "@/pages/admin/AdminCheckinDashboard";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminClasses from "@/pages/admin/AdminClasses";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAdmissions from "@/pages/admin/AdminAdmissions";
import ExamManagement from "@/pages/exams/ExamManagement";
import CheckingWorkspace from "@/pages/exams/CheckingWorkspace";
import TeacherExamChecking from "@/pages/teacher/TeacherExamChecking";
import AdmissionFormBuilderPage from "@/pages/staff/AdmissionFormBuilderPage";
import AdminSchedule from "@/pages/admin/AdminSchedule";
import AdminAI from "@/pages/admin/AdminAI";
import AdminFinancials from "@/pages/admin/AdminFinancials";
import SettingsPage from "@/pages/SettingsPage";

const queryClient = new QueryClient();

function AuthRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <CyberLoader message="Authenticating" />;
  if (user && role) return <Navigate to={getDashboardPath(role)} replace />;
  // Logged-in user with no app role → likely a parent
  if (user && !role) return <Navigate to="/parent/dashboard" replace />;
  return <LandingPage />;
}

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  return null;
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <PageTracker />
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/admissions" element={<DiscoverAdmissionPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/admission-history" element={<AdmissionHistoryPage />} />
            <Route path="/admission-chat" element={<AdmissionChatPage />} />
            <Route path="/results" element={<ResultsPortalPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/parent-login" element={<ParentLoginPage />} />
            {/* Friendly aliases so short URLs never 404 */}
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/signin" element={<Navigate to="/auth/login" replace />} />
            <Route path="/register" element={<Navigate to="/auth/register" replace />} />
            <Route path="/signup" element={<Navigate to="/auth/register" replace />} />
            <Route path="/parent-login" element={<Navigate to="/auth/parent-login" replace />} />
            <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
            <Route path="/parent/dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherClasses /></ProtectedRoute>} />
            <Route path="/teacher/classes/new" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/classes/:id" element={<ProtectedRoute allowedRoles={['teacher']}><ClassDetail /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/students/:id" element={<ProtectedRoute allowedRoles={['teacher']}><StudentDetailPage /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherTakeAttendance /></ProtectedRoute>} />
            <Route path="/teacher/attendance/analytics" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />
            <Route path="/teacher/ai" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/checkin" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCheckin /></ProtectedRoute>} />
            <Route path="/teacher/homework" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherHomework /></ProtectedRoute>} />
            <Route path="/teacher/results" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherResults /></ProtectedRoute>} />
            <Route path="/teacher/admissions" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAdmissions /></ProtectedRoute>} />
            <Route path="/teacher/admission-form" element={<ProtectedRoute allowedRoles={['teacher']}><AdmissionFormBuilderPage /></ProtectedRoute>} />
            <Route path="/teacher/programs" element={<ProtectedRoute allowedRoles={['teacher']}><AdminPrograms /></ProtectedRoute>} />
            <Route path="/teacher/exams" element={<ProtectedRoute allowedRoles={['teacher']}><ExamManagement /></ProtectedRoute>} />
            {/* Schedule is admin-only now */}
            <Route path="/teacher/schedule" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/chat" element={<Navigate to="/teacher/dashboard" replace />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/classes" element={<ProtectedRoute allowedRoles={['student']}><StudentClasses /></ProtectedRoute>} />
            <Route path="/student/classes/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentClassDetail /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={['student']}><StudentAnnouncements /></ProtectedRoute>} />
            <Route path="/student/notes" element={<ProtectedRoute allowedRoles={['student']}><StudentNotes /></ProtectedRoute>} />
            <Route path="/student/ai" element={<ProtectedRoute allowedRoles={['student']}><StudentAI /></ProtectedRoute>} />
            <Route path="/student/learning" element={<ProtectedRoute allowedRoles={['student']}><StudentLearning /></ProtectedRoute>} />
            <Route path="/student/homework" element={<ProtectedRoute allowedRoles={['student']}><StudentHomework /></ProtectedRoute>} />
            <Route path="/student/results" element={<ProtectedRoute allowedRoles={['student']}><StudentResults /></ProtectedRoute>} />
            <Route path="/student/chat" element={<Navigate to="/student/dashboard" replace />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeachers /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/students/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentDetail /></ProtectedRoute>} />
            <Route path="/admin/teachers/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeacherDetail /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['admin']}><AdminClasses /></ProtectedRoute>} />
            <Route path="/admin/classes/new" element={<ProtectedRoute allowedRoles={['admin']}><CreateClass /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/teacher-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeacherManagement /></ProtectedRoute>} />
            <Route path="/admin/checkin" element={<ProtectedRoute allowedRoles={['admin']}><AdminCheckinDashboard /></ProtectedRoute>} />
            <Route path="/admin/admissions" element={<ProtectedRoute allowedRoles={['admin']}><AdminAdmissions /></ProtectedRoute>} />
            <Route path="/exams/check/:checkId" element={<ProtectedRoute allowedRoles={['teacher','admin']}><CheckingWorkspace /></ProtectedRoute>} />
            <Route path="/teacher/exam-checking" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherExamChecking /></ProtectedRoute>} />
            <Route path="/admin/exam-terms" element={<ProtectedRoute allowedRoles={['admin']}><ExamManagement /></ProtectedRoute>} />
            <Route path="/admin/admission-form" element={<ProtectedRoute allowedRoles={['admin']}><AdmissionFormBuilderPage /></ProtectedRoute>} />
            <Route path="/admin/programs" element={<ProtectedRoute allowedRoles={['admin']}><AdminPrograms /></ProtectedRoute>} />
            <Route path="/admin/schedule" element={<ProtectedRoute allowedRoles={['admin']}><AdminSchedule /></ProtectedRoute>} />
            <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={['admin']}><AdminAI /></ProtectedRoute>} />
            <Route path="/admin/financials" element={<ProtectedRoute allowedRoles={['admin']}><AdminFinancials /></ProtectedRoute>} />

            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
