import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { ArrowRight, Lock, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { ApiClientError } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const LoginScene3D = lazy(() =>
  import('@/components/LoginScene3D').then((m) => ({ default: m.LoginScene3D })),
);

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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotDone, setForgotDone] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      className={cn(
        'relative flex min-h-full overflow-hidden',
        theme === 'light' ? 'login-light bg-[#e8f0f8]' : 'bg-[#080a0e]',
      )}
    >
      <Suspense fallback={null}>
        <LoginScene3D className="absolute inset-0 z-0" />
      </Suspense>
      <div aria-hidden className="login-grid-mask pointer-events-none absolute inset-0 z-[1] opacity-30" />
      <div aria-hidden className="login-vignette pointer-events-none absolute inset-0 z-[2]" />

      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border shadow-crm backdrop-blur-md transition-colors',
          theme === 'light'
            ? 'border-navy/15 bg-white/70 text-navy hover:bg-white'
            : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
        )}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>

      <main className="relative z-10 flex min-h-full w-full items-center justify-center px-5 py-12 sm:px-8">
        <div className="login-fade-up w-full max-w-[420px]">
          <Link to="/" className="mb-8 flex flex-col items-center gap-2">
            <img
              src="/velo-logo.png"
              alt="VeloSphere"
              className="h-16 w-auto object-contain drop-shadow-[0_8px_24px_rgba(148,188,227,0.28)]"
            />
          </Link>

          <div className="login-glass rounded-2xl p-6 sm:p-8">
            <div className="mb-6 text-center">
              <p className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.22em]',
                theme === 'light' ? 'text-primary' : 'text-[#94bce3]',
              )}>
                {forgotMode ? 'Reset password' : 'Sign in'}
              </p>
              <h2 className={cn(
                'mt-2 text-2xl font-semibold tracking-tight',
                theme === 'light' ? 'text-navy' : 'text-white',
              )}>
                {forgotMode ? 'Forgot password' : 'Welcome back'}
              </h2>
              <p className={cn(
                'mt-1.5 text-sm',
                theme === 'light' ? 'text-muted-foreground' : 'text-white/55',
              )}>
                {forgotMode
                  ? 'We’ll email your administrator a new temporary password for this account.'
                  : 'Use your organization email to continue.'}
              </p>
            </div>

            {forgotMode ? (
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setForgotDone(null);
                  setForgotBusy(true);
                  try {
                    const data = await apiFetch<{ message?: string }>(
                      '/api/auth/forgot-password',
                      {
                        method: 'POST',
                        body: JSON.stringify({ email: forgotEmail.trim() }),
                      },
                    );
                    setForgotDone(
                      data.message ??
                        'If this email is registered, your administrator will receive a reset email shortly.',
                    );
                  } catch (err) {
                    setError(
                      err instanceof ApiClientError
                        ? err.message
                        : 'Unable to send reset request',
                    );
                  } finally {
                    setForgotBusy(false);
                  }
                }}
              >
                <div>
                  <Label htmlFor="forgot-email" className={theme === 'light' ? '' : 'text-white/70'}>
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    className={cn(
                      'mt-1.5 h-11',
                      theme === 'light'
                        ? ''
                        : 'border-white/10 bg-white/5 text-white placeholder:text-white/35',
                    )}
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                {error ? (
                  <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </div>
                ) : null}
                {forgotDone ? (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                    {forgotDone}
                  </div>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full"
                  disabled={forgotBusy || !forgotEmail.trim()}
                >
                  {forgotBusy ? 'Sending…' : 'Email admin a new password'}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-[#94bce3] hover:underline"
                  onClick={() => {
                    setForgotMode(false);
                    setError(null);
                    setForgotDone(null);
                  }}
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form
                className="space-y-4"
                autoComplete="off"
                onSubmit={form.handleSubmit(async (values) => {
                  setError(null);
                  try {
                    await login(values.email, values.password);
                    const who = useAuthStore.getState().user?.name ?? '';
                    sessionStorage.setItem('velo-welcome', who);
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
                  <Label htmlFor="email" className={theme === 'light' ? '' : 'text-white/70'}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    autoComplete="off"
                    className={cn(
                      'mt-1.5 h-11',
                      theme === 'light'
                        ? ''
                        : 'border-white/10 bg-white/5 text-white placeholder:text-white/35',
                    )}
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
                  <Label htmlFor="password" className={theme === 'light' ? '' : 'text-white/70'}>
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock
                      className={cn(
                        'pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
                        theme === 'light' ? 'text-muted-foreground' : 'text-white/35',
                      )}
                    />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="off"
                      className={cn(
                        'h-11 pl-9',
                        theme === 'light'
                          ? ''
                          : 'border-white/10 bg-white/5 text-white placeholder:text-white/35',
                      )}
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
                <button
                  type="button"
                  className="w-full text-center text-sm text-[#94bce3] hover:underline"
                  onClick={() => {
                    setForgotMode(true);
                    setError(null);
                    setForgotDone(null);
                    setForgotEmail(form.getValues('email') || '');
                  }}
                >
                  Forgot password?
                </button>
              </form>
            )}
          </div>

          <p
            className={cn(
              'mt-6 text-center text-[11px]',
              theme === 'light' ? 'text-muted-foreground' : 'text-white/35',
            )}
          >
            Protected workspace · Authorized personnel only
          </p>
        </div>
      </main>
    </div>
  );
}
