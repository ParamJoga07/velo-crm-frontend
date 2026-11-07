import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Moon, ShieldCheck, Sun, Users, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { ApiClientError } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ThreeScene } from '@/components/landing/ThreeScene';
import { makeGlobeScene } from '@/components/landing/globeScene';
import { heroMotion } from '@/components/landing/scenes';
import './login.css';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const loginGlobe = makeGlobeScene({ cardDrift: -1.4 });

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
  const [showPassword, setShowPassword] = useState(false);
  const reduce = useReducedMotion();
  const light = theme === 'light';

  // Assemble the globe on arrival.
  useEffect(() => {
    if (reduce) {
      heroMotion.progress = 1;
      return;
    }
    heroMotion.progress = 0;
    const tween = gsap.to(heroMotion, { progress: 1, duration: 2.4, ease: 'expo.out', delay: 0.2 });
    return () => {
      tween.kill();
    };
  }, [reduce]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const labelClass = light ? 'text-[#1c1f26]' : 'text-white/80';
  const hintClass = light ? 'text-[#6b7280]' : 'text-white/50';
  const fieldClass = cn(
    'login-input h-12 pl-10',
    light
      ? 'border-[#d5dae1] bg-white text-[#1c1f26] placeholder:text-[#8b93a1]'
      : 'border-white/10 bg-white/[0.04] text-white placeholder:text-white/35',
  );
  const iconClass = cn(
    'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2',
    light ? 'text-[#6b7280]' : 'text-white/40',
  );

  return (
    <div className={cn('login-root', light ? 'login-light' : 'login-dark')}>
      <div className="login-layout">
        <aside className="login-brand">
          <div className="login-brand-bg" aria-hidden />
          <ThreeScene build={loginGlobe} className="login-globe" cameraZ={7.6} fov={36} />
          <div className="login-brand-fade" aria-hidden />

          <div className="login-brand-top">
            <Link to="/" className="login-logo">
              <img src="/velo-logo.png" alt="VeloSphere" />
            </Link>
            <Link to="/" className="login-back">
              ← Back to site
            </Link>
          </div>

          <motion.div
            className="login-brand-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          >
            <div className="login-eyebrow">
              <span className="login-dot" />
              Operations console
            </div>
            <h1 className="login-h1">
              Your floor,
              <br />
              <span className="login-grad">one sphere.</span>
            </h1>
            <ul className="login-points">
              {(
                [
                  [Users, 'Every agent sees their own book, managers see the team'],
                  [Zap, 'Leads routed by rule the moment they land'],
                  [ShieldCheck, 'One tenant per company, enforced at every query'],
                ] as const
              ).map(([Icon, text], i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.6 + i * 0.1 }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <div className="login-brand-foot">
            <span>velospherecrm.com</span>
            <span className="font-mono">Asia/Kolkata · IST</span>
          </div>
        </aside>

        <main className="login-sheet">
          <div className="login-sheet-top">
            <button
              type="button"
              onClick={toggleTheme}
              className="login-theme"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <motion.div
            className="login-card"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          >
            <div className="mb-8">
              <h2 className="text-[1.75rem] font-semibold tracking-tight">
                {forgotMode ? 'Reset your password' : 'Welcome back'}
              </h2>
              <p className={cn('mt-2 text-sm leading-relaxed', hintClass)}>
                {forgotMode
                  ? 'We’ll ask an administrator to send a temporary password to this account.'
                  : 'Use your work email. Password managers can fill this in.'}
              </p>
            </div>

            {forgotMode ? (
              <form
                className="space-y-5"
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
                  <Label htmlFor="forgot-email" className={labelClass}>
                    Work email
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail className={iconClass} />
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="username"
                      className={fieldClass}
                      placeholder="you@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>
                {error ? <FormAlert>{error}</FormAlert> : null}
                {forgotDone ? (
                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-sm',
                      light
                        ? 'border-emerald-700/20 bg-emerald-50 text-emerald-900'
                        : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
                    )}
                  >
                    {forgotDone}
                  </div>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full"
                  disabled={forgotBusy || !forgotEmail.trim()}
                >
                  {forgotBusy ? 'Sending…' : 'Email admin a new password'}
                </Button>
                <button
                  type="button"
                  className={cn('text-sm font-medium hover:underline', light ? 'text-[#3d5a80]' : 'text-[#94bce3]')}
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
                className="space-y-5"
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
                  <Label htmlFor="email" className={labelClass}>
                    Work email
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail className={iconClass} />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      className={fieldClass}
                      placeholder="you@company.com"
                      aria-invalid={form.formState.errors.email ? true : undefined}
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email ? (
                    <p className="mt-1.5 text-xs text-danger">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className={labelClass}>
                      Password
                    </Label>
                    <button
                      type="button"
                      className={cn(
                        'text-xs font-medium hover:underline',
                        light ? 'text-[#3d5a80]' : 'text-[#94bce3]',
                      )}
                      onClick={() => {
                        setForgotMode(true);
                        setError(null);
                        setForgotDone(null);
                        setForgotEmail(form.getValues('email') || '');
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className={iconClass} />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={cn(fieldClass, 'pr-11')}
                      placeholder="Your password"
                      aria-invalid={form.formState.errors.password ? true : undefined}
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      className={cn(
                        'absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md',
                        light ? 'text-[#6b7280] hover:bg-[#eef1f5]' : 'text-white/50 hover:bg-white/10',
                      )}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password ? (
                    <p className="mt-1.5 text-xs text-danger">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                {error ? <FormAlert>{error}</FormAlert> : null}

                <Button
                  type="submit"
                  size="lg"
                  className="login-submit group h-12 w-full text-[15px]"
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
            )}

            <p className={cn('mt-7 text-xs leading-relaxed', hintClass)}>
              This is a private company workspace. Sign in only with an account an administrator
              created for you.
            </p>
          </motion.div>

          <p className={cn('login-sheet-foot', hintClass)}>© 2026 VeloSphere CRM</p>
        </main>
      </div>
    </div>
  );
}

function FormAlert({ children }: { children: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
    >
      {children}
    </div>
  );
}
