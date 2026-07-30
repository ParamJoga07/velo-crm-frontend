import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { AppShell } from '@/layouts/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { LeadsPage } from '@/pages/LeadsPage';
import { LeadDetailPage } from '@/pages/LeadDetailPage';
import { LeadCreatePage } from '@/pages/LeadCreatePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AgentDashboardPage } from '@/pages/AgentDashboardPage';
import { ImportsLandingPage } from '@/pages/ImportsLandingPage';
import { ImportHistoryPage } from '@/pages/ImportHistoryPage';
import { ImportUploadPage } from '@/pages/ImportUploadPage';
import { UsersPage } from '@/pages/UsersPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { LeavePage } from '@/pages/LeavePage';
import { HrmsPage } from '@/pages/HrmsPage';
import { CompanyPage } from '@/pages/CompanyPage';
import { PerformancePage } from '@/pages/PerformancePage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { LeadSettingsPage } from '@/pages/LeadSettingsPage';
import { ExportsPage } from '@/pages/ExportsPage';
import { ReassignPage } from '@/pages/ReassignPage';

function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleHome() {
  return <Navigate to="/dashboard" replace />;
}

function DashboardRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'USER') return <AgentDashboardPage />;
  return <DashboardPage />;
}

function RequireImportRole() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'USER') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/new" element={<LeadCreatePage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="hrms" element={<HrmsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="company" element={<CompanyPage />} />
          <Route path="admin/attendance" element={<AttendancePage />} />
          <Route element={<RequireImportRole />}>
            <Route path="admin/users" element={<UsersPage />} />
            <Route path="admin/imports" element={<ImportsLandingPage />} />
            <Route path="admin/imports/:type" element={<ImportHistoryPage />} />
            <Route
              path="admin/imports/:type/new"
              element={<ImportUploadPage />}
            />
            <Route path="admin/lead-settings" element={<LeadSettingsPage />} />
            <Route path="admin/exports" element={<ExportsPage />} />
            <Route path="admin/reassign" element={<ReassignPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
