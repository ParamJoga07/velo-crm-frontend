import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { ApiClientError } from '@/lib/api';

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
    navigate(user.role === 'USER' ? '/leads' : '/dashboard', { replace: true });
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden p-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(800px 500px at 15% 20%, var(--login-glow), transparent 60%), radial-gradient(700px 400px at 90% 80%, rgba(61,90,128,0.12), transparent 55%), var(--login-bg)',
        }}
      />
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/15"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface-raised shadow-crm">
        <div className="flex items-center gap-3 border-b border-border bg-navy px-6 py-5 dark:bg-surface-muted">
          <img
            src="/velo-logo.png"
            alt="Velo"
            className="h-12 w-12 rounded-md bg-black/20 object-contain p-1"
          />
          <div>
            <p className="text-xl font-bold tracking-tight text-white dark:text-foreground">
              Velo
            </p>
            <p className="text-xs text-white/70 dark:text-muted-foreground">
              Enterprise real estate lead CRM
            </p>
          </div>
        </div>
        <form
          className="space-y-4 px-6 py-6"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await login(values.email, values.password);
              const role = useAuthStore.getState().user?.role;
              navigate(role === 'USER' ? '/leads' : '/dashboard', {
                replace: true,
              });
            } catch (e) {
              setError(
                e instanceof ApiClientError ? e.message : 'Unable to sign in',
              );
            }
          })}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" className="mt-1.5" {...form.register('email')} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              className="mt-1.5"
              {...form.register('password')}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
