import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState, type ComponentType } from 'react';
import {
  ArrowRight,
  Building2,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@acme.local', password: 'Password123!' },
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-full overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 login-atmosphere lg:hidden"
      />

      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-raised/90 text-navy shadow-crm backdrop-blur transition-colors hover:bg-surface-muted',
        )}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>

      {/* Full-bleed split — brand plane edge-to-edge on desktop */}
      <div className="relative z-10 grid min-h-full w-full lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14 xl:px-16">
          <div aria-hidden className="absolute inset-0 login-brand-plane" />
          <div
            aria-hidden
            className="absolute inset-0 login-grid-mask opacity-[0.35] dark:opacity-[0.22]"
          />

          <div className="login-fade-up relative">
            <div className="inline-flex items-center gap-3">
              <img
                src="/velo-logo.png"
                alt=""
                className="h-11 w-11 rounded-md bg-navy-muted/40 object-contain p-1 ring-1 ring-white/10"
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Operations console
              </span>
            </div>
          </div>

          <div className="relative max-w-lg pb-8 pt-16">
            <h1 className="login-fade-up login-delay-1 font-sans text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-[3.35rem]">
              Velo
            </h1>
            <p className="login-fade-up login-delay-2 mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
              Enterprise real estate lead CRM — assignment, attendance, and
              pipeline control in one workspace.
            </p>

            <ul className="login-fade-up login-delay-3 mt-10 space-y-4">
              <Feature
                icon={Users}
                title="Team-scoped lead ownership"
                body="Managers assign, agents work their book."
              />
              <Feature
                icon={Building2}
                title="Import to pipeline"
                body="Batch intake with live balance tracking."
              />
              <Feature
                icon={ShieldCheck}
                title="Role-aware access"
                body="Admin, manager, and agent views stay separated."
              />
            </ul>
          </div>

          <p className="login-fade-up login-delay-4 relative text-[11px] tracking-wide text-white/40">
            Secure tenant access · Asia/Hyderabad ready
          </p>
        </aside>

        <main className="relative flex items-center justify-center px-5 py-12 sm:px-8 lg:bg-background lg:px-12">
          <div className="login-fade-up login-delay-1 w-full max-w-[400px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <img
                src="/velo-logo.png"
                alt="Velo"
                className="h-10 w-10 rounded-md bg-navy object-contain p-1"
              />
              <div>
                <p className="text-lg font-bold tracking-tight text-navy">Velo</p>
                <p className="text-xs text-muted-foreground">
                  Enterprise lead CRM
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface-raised/95 p-6 shadow-crm backdrop-blur-sm sm:p-7 dark:bg-surface-raised">
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Sign in
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Use your organization email to continue.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(async (values) => {
                  setError(null);
                  try {
                    await login(values.email, values.password);
                    navigate('/dashboard', { replace: true });
                  } catch (e) {
                    setError(
                      e instanceof ApiClientError
                        ? e.message
                        : 'Unable to sign in',
                    );
                  }
                })}
              >
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    autoComplete="username"
                    className="mt-1.5 h-11 bg-surface"
                    placeholder="you@company.com"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email ? (
                    <p className="mt-1 text-xs text-danger">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="h-11 bg-surface pl-9"
                      placeholder="••••••••"
                      {...form.register('password')}
                    />
                  </div>
                  {form.formState.errors.password ? (
                    <p className="mt-1 text-xs text-danger">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="group mt-2 h-11 w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    'Signing in…'
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              Protected workspace · Authorized personnel only
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white ring-1 ring-white/15">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{body}</p>
      </div>
    </li>
  );
}
