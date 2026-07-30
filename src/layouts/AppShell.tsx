import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  CalendarOff,
  Download,
  FileText,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  Sun,
  Target,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { useEffect, useState, type ComponentType } from 'react';
import { apiFetch } from '@/lib/api';

const ADMIN_NAV = [
  {
    to: '/performance',
    label: 'Performance',
    icon: Target,
    roles: ['SUPERADMIN', 'MANAGER', 'USER'],
  },
  {
    to: '/admin/users',
    label: 'User Management',
    icon: Users,
    roles: ['SUPERADMIN', 'MANAGER'],
  },
  {
    to: '/admin/attendance',
    label: 'Attendance & Availability',
    icon: CalendarDays,
    roles: ['SUPERADMIN', 'MANAGER', 'USER'],
  },
  {
    to: '/leave',
    label: 'Leave',
    icon: CalendarOff,
    roles: ['SUPERADMIN', 'MANAGER', 'USER'],
  },
  {
    to: '/hrms',
    label: 'HRMS',
    icon: Users,
    roles: ['SUPERADMIN', 'MANAGER', 'USER'],
  },
  {
    to: '/documents',
    label: 'Documents',
    icon: FileText,
    roles: ['SUPERADMIN', 'MANAGER', 'USER'],
  },
  {
    to: '/company',
    label: 'Company profile',
    icon: Building2,
    roles: ['SUPERADMIN', 'MANAGER'],
  },
  {
    to: '/admin/imports',
    label: 'Imports',
    icon: FileUp,
    roles: ['SUPERADMIN', 'MANAGER'],
  },
  {
    to: '/admin/exports',
    label: 'Exports',
    icon: Download,
    roles: ['SUPERADMIN', 'MANAGER'],
  },
  {
    to: '/admin/reassign',
    label: 'Reassign Leads',
    icon: RefreshCw,
    roles: ['SUPERADMIN', 'MANAGER'],
  },
  {
    to: '/admin/lead-settings',
    label: 'Lead Settings',
    icon: Settings2,
    roles: ['SUPERADMIN', 'MANAGER'],
  },
] as const;

export function AppShell() {
  const { user, tenant, accessToken, logout, impersonation, stopImpersonation } =
    useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [navOpen]);

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

  const mobilePrimary = isUser
    ? ([
        { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/leads', label: 'Leads', icon: Building2 },
        { to: '/admin/attendance', label: 'Attendance', icon: CalendarDays },
      ] as const)
    : ([
        { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/leads', label: 'Leads', icon: Building2 },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/attendance', label: 'Attend.', icon: CalendarDays },
      ] as const);

  const NavBody = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {isUser ? 'Workspace' : 'Administration'}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-navy">
          {isUser ? 'My Console' : 'Ops Console'}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {isUser ? (
          <>
            <SideLink
              to="/dashboard"
              label="My Dashboard"
              icon={LayoutDashboard}
              onNavigate={onNavigate}
            />
            <SideLink
              to="/leads"
              label="My Leads"
              icon={Building2}
              onNavigate={onNavigate}
            />
          </>
        ) : (
          <>
            <SideLink
              to="/dashboard"
              label="Dashboard"
              icon={LayoutDashboard}
              onNavigate={onNavigate}
            />
            <SideLink
              to="/leads"
              label="All Leads"
              icon={Building2}
              onNavigate={onNavigate}
            />
          </>
        )}
        {visibleNav.map((item) => (
          <SideLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-border p-2 md:hidden">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-[13px] text-navy/80 hover:bg-surface-muted"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-[13px] text-danger hover:bg-surface-muted"
          onClick={async () => {
            onNavigate?.();
            await logout();
            navigate('/login');
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {impersonation ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-3 py-2 text-xs text-amber-950 sm:px-4 sm:text-sm">
          <span className="min-w-0">
            Viewing as <strong>{impersonation.targetName}</strong>
            <span className="hidden sm:inline">
              {' '}
              — originally {impersonation.adminName}
            </span>
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 shrink-0 border-amber-800/30 bg-white/90 text-amber-950 hover:bg-white"
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
        {/* Desktop icon rail */}
        <aside
          className="hidden w-rail shrink-0 flex-col items-center gap-1.5 py-3 md:flex"
          style={{ background: 'var(--rail-bg)', color: 'var(--rail-fg)' }}
        >
          <button
            type="button"
            onClick={() => navigate(landing)}
            className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-navy-muted/40 ring-1 ring-white/10"
            title="Velo CRM"
          >
            <img
              src="/velo-logo.png"
              alt="Velo"
              className="h-8 w-8 object-contain"
            />
          </button>
          <RailIcon to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
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

        {/* Desktop sidebar */}
        <aside
          className="hidden w-sidebar shrink-0 flex-col border-r border-border lg:flex"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <NavBody />
        </aside>

        {/* Mobile drawer */}
        {navOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            />
            <div
              className="absolute inset-y-0 left-0 flex w-[min(100%,300px)] flex-col shadow-crm"
              style={{ background: 'var(--sidebar-bg)' }}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/velo-logo.png"
                    alt=""
                    className="h-8 w-8 rounded-md bg-navy object-contain p-0.5"
                  />
                  <span className="text-sm font-semibold text-navy">Velo</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <NavBody onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 shadow-panel sm:h-topbar sm:gap-3 sm:px-4"
            style={{ background: 'var(--topbar-bg)' }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <button
              type="button"
              className="flex shrink-0 items-center gap-2 md:hidden"
              onClick={() => navigate(landing)}
            >
              <img
                src="/velo-logo.png"
                alt="Velo"
                className="h-7 w-7 rounded object-contain"
              />
            </button>

            <div className="relative min-w-0 flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder={isUser ? 'Search leads…' : 'Search…'}
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <span className="hidden font-semibold text-navy xl:inline">
                {tenant.name}
              </span>
              {!isUser ? (
                <span
                  className="hidden rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline sm:text-[11px]"
                  title={
                    tenant.leadLimit != null && tenant.leadsUsed != null
                      ? `Limit ${tenant.leadLimit.toLocaleString()} − imported ${tenant.leadsUsed.toLocaleString()} = remaining ${tenant.leadBalance.toLocaleString()}`
                      : 'Remaining lead quota'
                  }
                >
                  <span className="hidden md:inline">Lead balance: </span>
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
                className="hidden sm:inline-flex"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <NotificationBell />
              <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden text-right leading-tight lg:block">
                  <div className="text-xs font-semibold text-navy">
                    {user.name}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {user.role}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-auto p-3 pb-20 sm:p-4 md:pb-4">
            <Outlet />
          </main>

          {/* Mobile bottom tab bar */}
          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface-raised/95 backdrop-blur md:hidden safe-bottom">
            {mobilePrimary.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-navy',
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
            <button
              type="button"
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground hover:text-navy"
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
              More
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-2.5 py-2.5 text-[13px] transition-colors sm:py-2',
          isActive
            ? 'bg-primary-muted font-semibold text-primary-dark'
            : 'text-navy/80 hover:bg-surface-muted',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
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
  icon: ComponentType<{ className?: string }>;
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
