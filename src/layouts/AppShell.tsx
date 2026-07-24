import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  Download,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  Sun,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const ADMIN_NAV = [
  { to: '/admin/users', label: 'User Management', icon: Users, roles: ['SUPERADMIN', 'MANAGER'] },
  { to: '/admin/attendance', label: 'Attendance & Availability', icon: CalendarDays, roles: ['SUPERADMIN', 'MANAGER', 'USER'] },
  { to: '/admin/imports', label: 'Imports', icon: FileUp, roles: ['SUPERADMIN', 'MANAGER'] },
  { to: '/admin/exports', label: 'Exports', icon: Download, roles: ['SUPERADMIN', 'MANAGER'] },
  { to: '/admin/reassign', label: 'Reassign Leads', icon: RefreshCw, roles: ['SUPERADMIN', 'MANAGER'] },
  { to: '/admin/lead-settings', label: 'Lead Settings', icon: Settings2, roles: ['SUPERADMIN', 'MANAGER'] },
] as const;

export function AppShell() {
  const { user, tenant, accessToken, logout, impersonation, stopImpersonation } =
    useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken) return;
    const refreshTenant = () => {
      void apiFetch<{
        tenant: {
          id: string;
          name: string;
          timezone: string;
          leadBalance: number;
          leadLimit?: number;
          leadsUsed?: number;
        };
      }>('/api/auth/me', { accessToken })
        .then((me) => {
          if (me?.tenant) {
            useAuthStore.setState({
              tenant: {
                id: me.tenant.id,
                name: me.tenant.name,
                timezone: me.tenant.timezone,
                leadBalance: me.tenant.leadBalance,
                leadLimit: me.tenant.leadLimit,
                leadsUsed: me.tenant.leadsUsed,
              },
            });
          }
        })
        .catch(() => undefined);
    };
    refreshTenant();
    const id = window.setInterval(() => {
      void apiFetch('/api/attendance/heartbeat', {
        method: 'POST',
        accessToken,
      }).catch(() => undefined);
      refreshTenant();
    }, 120_000);
    return () => window.clearInterval(id);
  }, [accessToken]);

  if (!user || !tenant) return null;

  const isUser = user.role === 'USER';
  const landing = '/dashboard';
  const visibleNav = ADMIN_NAV.filter((item) =>
    (item.roles as readonly string[]).includes(user.role),
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {impersonation ? (
        <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-amber-950">
          <span>
            Viewing as <strong>{impersonation.targetName}</strong> — signed in
            originally as {impersonation.adminName}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 border-amber-800/30 bg-white/90 text-amber-950 hover:bg-white"
            onClick={() => {
              stopImpersonation();
              navigate('/admin/users');
            }}
          >
            Exit view-as
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
      <aside
        className="flex w-rail shrink-0 flex-col items-center gap-1.5 py-3"
        style={{ background: 'var(--rail-bg)', color: 'var(--rail-fg)' }}
      >
        <button
          type="button"
          onClick={() => navigate(landing)}
          className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-navy-muted/40 ring-1 ring-white/10"
          title="Velo CRM"
        >
          <img src="/velo-logo.png" alt="Velo" className="h-8 w-8 object-contain" />
        </button>
        <RailIcon
          to="/dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
        />
        <RailIcon to="/leads" label="Leads" icon={Building2} />
        <RailIcon
          to="/admin/attendance"
          label="Attendance"
          icon={CalendarDays}
          hidden={!isUser}
        />
        <RailIcon
          to="/admin/imports"
          label="Admin"
          icon={Settings2}
          hidden={isUser}
        />
        <div className="mt-auto flex flex-col gap-1 pb-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10 hover:text-white"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10 hover:text-white"
            title="Logout"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <aside
        className="flex w-sidebar shrink-0 flex-col border-r border-border"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {isUser ? 'Workspace' : 'Administration'}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-navy">
            {isUser ? 'My Console' : 'Ops Console'}
          </p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {isUser ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                    isActive
                      ? 'bg-primary-muted font-semibold text-primary-dark'
                      : 'text-navy/80 hover:bg-surface-muted',
                  )
                }
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                My Dashboard
              </NavLink>
              <NavLink
                to="/leads"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                    isActive
                      ? 'bg-primary-muted font-semibold text-primary-dark'
                      : 'text-navy/80 hover:bg-surface-muted',
                  )
                }
              >
                <Building2 className="h-4 w-4 shrink-0" />
                My Leads
              </NavLink>
            </>
          ) : null}
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                    isActive
                      ? 'bg-primary-muted font-semibold text-primary-dark'
                      : 'text-navy/80 hover:bg-surface-muted',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-topbar items-center gap-3 border-b border-border px-4 shadow-panel"
          style={{ background: 'var(--topbar-bg)' }}
        >
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={
                isUser
                  ? 'Search my leads…'
                  : 'Search leads, users, campaigns…'
              }
              className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="ml-auto flex items-center gap-2.5 text-sm">
            <span className="hidden font-semibold text-navy md:inline">
              {tenant.name}
            </span>
            {!isUser ? (
              <span
                className="rounded border border-border bg-surface px-2 py-1 font-mono text-[11px] text-muted-foreground"
                title={
                  tenant.leadLimit != null && tenant.leadsUsed != null
                    ? `Limit ${tenant.leadLimit.toLocaleString()} − imported ${tenant.leadsUsed.toLocaleString()} = remaining ${tenant.leadBalance.toLocaleString()}`
                    : 'Remaining lead quota'
                }
              >
                Lead balance:{' '}
                <span className="font-semibold text-navy">
                  {tenant.leadBalance.toLocaleString()}
                </span>
                {tenant.leadLimit != null ? (
                  <span className="text-muted-foreground">
                    {' '}
                    / {tenant.leadLimit.toLocaleString()}
                  </span>
                ) : null}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" title="Help">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-xs font-semibold text-navy">{user.name}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      </div>
    </div>
  );
}

function RailIcon({
  to,
  label,
  icon: Icon,
  hidden,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        cn(
          'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-white/10 hover:text-white',
        )
      }
    >
      <Icon className="h-4 w-4" />
    </NavLink>
  );
}
