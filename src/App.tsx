import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthHasHydrated, useAuthStore } from '@/stores/auth';
import { AppShell } from '@/layouts/AppShell';
import { LandingPage } from '@/pages/LandingPage';
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
import { LeadRegistrationsPage } from '@/pages/LeadRegistrationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PayrollPage } from '@/pages/PayrollPage';
import { LeadSettingsPage } from '@/pages/LeadSettingsPage';
import { ExportsPage } from '@/pages/ExportsPage';
import { ReassignPage } from '@/pages/ReassignPage';

function RequireAuth() {
  const hydrated = useAuthHasHydrated();
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const user = useAuthStore((s) => s.user);
  // Wait for hydrate + token refresh before mounting API-driven pages
  if (!hydrated || (user && !sessionReady)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
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

function RequireLeadCreateRole() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'USER') return <Navigate to="/leads" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route element={<RequireLeadCreateRole />}>
            <Route path="leads/new" element={<LeadCreatePage />} />
          </Route>
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="lead-registrations" element={<LeadRegistrationsPage />} />
          <Route path="meetings" element={<Navigate to="/lead-registrations" replace />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="hrms" element={<HrmsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="documents" element={<HrmsPage />} />
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
            <Route
              path="admin/lead-registrations"
              element={<Navigate to="/lead-registrations" replace />}
            />
            <Route path="admin/payroll" element={<PayrollPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
