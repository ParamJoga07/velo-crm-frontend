import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/button';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Your workspace preferences and profile."
      />
      <div className="max-w-lg space-y-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel">
        <p className="text-sm font-semibold text-navy">{user?.name}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Moon className="mr-1.5 h-3.5 w-3.5" />
            )}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
          <Button asChild variant="secondary">
            <Link to="/hrms">Open my HRMS profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
