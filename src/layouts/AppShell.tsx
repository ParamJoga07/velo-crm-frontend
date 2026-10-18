import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calculator,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings2,
  Sun,
  Target,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { AiChatWidget } from '@/components/AiChatWidget';
import { WelcomeGreeting } from '@/components/WelcomeGreeting';
import { SaleBanner } from '@/components/SaleBanner';
import { cn } from '@/lib/utils';
import { useEffect, useState, type ComponentType } from 'react';
import { apiFetch } from '@/lib/api';
import { applyTenantBrand, productNameFromTenant } from '@/lib/brand';

const NAV_GROUPS: {
  heading?: string;
  items: {
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    roles: readonly string[];
  }[];
}[] = [
  {
    items: [
      {
        to: '/performance',
        label: 'Performance',
        icon: Target,
        roles: ['SUPERADMIN', 'MANAGER', 'USER'],
      },
      {
        to: '/lead-registrations',
        label: 'Lead Registration',
        icon: ClipboardCheck,
        roles: ['SUPERADMIN', 'MANAGER', 'USER'],
      },
      {
        to: '/admin/users',
        label: 'User Management',
        icon: Users,
        roles: ['SUPERADMIN', 'MANAGER'],
      },
    ],
  },
  {
    heading: 'People & Operations',
    items: [
      {
        to: '/hrms',
        label: 'HRMS',
        icon: Users,
        roles: ['SUPERADMIN', 'MANAGER', 'USER'],
      },
      {
        to: '/admin/attendance',
        label: 'Attendance & Leaves',
        icon: CalendarDays,
        roles: ['SUPERADMIN', 'MANAGER', 'USER'],
      },
    ],
  },
  {
    items: [
      {
        to: '/company',
        label: 'Company Settings',
        icon: Building2,
        roles: ['SUPERADMIN', 'MANAGER'],
      },
      {
        to: '/settings',
        label: 'Settings',
        icon: Settings2,
        roles: ['USER'],
      },
    ],
  },
  {
    heading: 'Quick Actions',
    items: [
      {
        to: '/admin/imports',
        label: 'Import / Export',
        icon: FileUp,
        roles: ['SUPERADMIN', 'MANAGER'],
      },
      {
        to: '/admin/exports',
        label: 'Reports',
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
        to: '/admin/payroll',
        label: 'Payroll Calculator',
        icon: Calculator,
        roles: ['SUPERADMIN', 'MANAGER'],
      },
      {
        to: '/performance?tab=sales',
        label: 'Sales & Targets',
        icon: Wallet,
        roles: ['SUPERADMIN', 'MANAGER'],
      },
      {
        to: '/admin/lead-settings',
        label: 'Lead Settings',
        icon: Settings2,
        roles: ['SUPERADMIN', 'MANAGER'],
      },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = 'velo.sidebarCollapsed';
const NAV_GROUPS_COLLAPSED_KEY = 'velo.navGroupsCollapsed';

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function AppShell() {
  const { user, tenant, accessToken, logout, impersonation, stopImpersonation } =
    useAuthStore();
  const productName = productNameFromTenant(tenant);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readStored<boolean>(SIDEBAR_COLLAPSED_KEY) ?? false,
  );
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >(() => readStored<Record<string, boolean>>(NAV_GROUPS_COLLAPSED_KEY) ?? {});

  const toggleSidebar = () =>
    setSidebarCollapsed((prev) => {
      writeStored(SIDEBAR_COLLAPSED_KEY, !prev);
      return !prev;
    });

  const toggleGroup = (heading: string) =>
    setCollapsedGroups((prev) => {
      const next = { ...prev, [heading]: !prev[heading] };
      writeStored(NAV_GROUPS_COLLAPSED_KEY, next);
      return next;
    });

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
        tenant: NonNullable<ReturnType<typeof useAuthStore.getState>['tenant']>;
      }>('/api/auth/me', { accessToken })
        .then((me) => {
          if (me?.tenant) {
            useAuthStore.setState({ tenant: me.tenant });
            applyTenantBrand(me.tenant);
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
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  const mobilePrimary = isUser
    ? ([
        { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/leads', label: 'Leads', icon: Building2 },
        { to: '/lead-registrations', label: 'Register', icon: ClipboardCheck },
        { to: '/admin/attendance', label: 'Attend.', icon: CalendarDays },
      ] as const)
    : ([
        { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { to: '/leads', label: 'Leads', icon: Building2 },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/attendance', label: 'Attend.', icon: CalendarDays },
      ] as const);

  const NavBody = ({
    onNavigate,
    compact = false,
    onToggleCompact,
  }: {
    onNavigate?: () => void;
    compact?: boolean;
    onToggleCompact?: () => void;
  }) => (
    <>
      {compact ? (
        <div className="flex justify-center border-b border-border py-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy/70 hover:bg-surface-muted hover:text-navy"
            title="Expand sidebar"
            aria-label="Expand sidebar"
            onClick={onToggleCompact}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="border-b border-border px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <img
              src="/velo-logo.png"
              alt={productName}
              className="h-7 w-auto object-contain"
            />
            {onToggleCompact ? (
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-navy/70 hover:bg-surface-muted hover:text-navy"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                onClick={onToggleCompact}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {isUser ? 'Workspace' : 'Administration'}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-navy">
            {isUser ? 'My Console' : 'Ops Console'}
          </p>
        </div>
      )}
      <nav
        className={cn(
          'flex flex-1 flex-col gap-0.5 overflow-y-auto',
          compact ? 'items-center px-1.5 py-2' : 'p-2',
        )}
      >
        <SideLink
          to="/dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
          onNavigate={onNavigate}
          compact={compact}
        />
        <SideLink
          to="/leads"
          label="Leads"
          icon={Building2}
          onNavigate={onNavigate}
          compact={compact}
        />
        {visibleGroups.map((group) => {
          const groupCollapsed =
            !compact && !!group.heading && !!collapsedGroups[group.heading];
          return (
            <div
              key={group.heading ?? group.items[0]?.to}
              className={cn(
                'mt-2 flex flex-col gap-0.5',
                compact && 'w-full items-center border-t border-border pt-2',
              )}
            >
              {group.heading && !compact ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-navy"
                  aria-expanded={!groupCollapsed}
                  onClick={() => toggleGroup(group.heading!)}
                >
                  {group.heading}
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      groupCollapsed && '-rotate-90',
                    )}
                  />
                </button>
              ) : null}
              {groupCollapsed
                ? null
                : group.items.map((item) => (
                    <SideLink
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      onNavigate={onNavigate}
                      compact={compact}
                    />
                  ))}
            </div>
          );
        })}
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
      <WelcomeGreeting name={user.name} />
      <SaleBanner />
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
            title={productName}
          >
            <img
              src="/velo-mark.png"
              alt={productName}
              className="h-8 w-8 object-contain"
            />
          </button>
          <RailIcon to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <RailIcon to="/leads" label="Leads" icon={Building2} />
          <RailIcon
            to="/lead-registrations"
            label="Register"
            icon={ClipboardCheck}
          />
          <RailIcon
            to="/admin/attendance"
            label="Attendance"
            icon={CalendarDays}
            hidden={!isUser}
          />
          <RailIcon
            to="/performance"
            label="Performance"
            icon={Target}
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
          className={cn(
            'hidden shrink-0 flex-col border-r border-border transition-[width] duration-200 lg:flex',
            sidebarCollapsed ? 'w-14' : 'w-sidebar',
          )}
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <NavBody
            compact={sidebarCollapsed}
            onToggleCompact={toggleSidebar}
          />
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
                    src="/velo-mark.png"
                    alt=""
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-sm font-semibold text-navy">
                    {productName}
                  </span>
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
                alt={productName}
                className="h-7 w-auto max-w-[140px] object-contain"
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
                <>
                  <span
                    className="hidden rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline sm:text-[11px]"
                    title="Active seats vs plan limit"
                  >
                    Seats{' '}
                    <span className="font-semibold text-navy">
                      {tenant.seatsUsed ?? '—'}
                    </span>
                    {tenant.seatLimit != null ? (
                      <span> / {tenant.seatLimit}</span>
                    ) : null}
                  </span>
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
                </>
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
      <AiChatWidget />
    </div>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  onNavigate,
  compact = false,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const location = useLocation();
  const [pathname, query = ''] = to.split('?');
  const search = query ? `?${query}` : '';
  const active =
    location.pathname === pathname &&
    (search
      ? location.search === search
      : !location.search.includes('tab=documents'));

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={compact ? label : undefined}
      aria-label={compact ? label : undefined}
      className={cn(
        'flex items-center rounded-md text-[13px] transition-colors',
        compact
          ? 'h-9 w-9 justify-center'
          : 'gap-2 px-2.5 py-2.5 sm:py-2',
        active
          ? 'bg-primary-muted font-semibold text-primary-dark'
          : 'text-navy/80 hover:bg-surface-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {compact ? null : label}
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
