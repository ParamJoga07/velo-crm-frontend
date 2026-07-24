import { Link } from 'react-router-dom';
import { FileSpreadsheet, CalendarClock, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

const TILES = [
  {
    type: 'LEADS',
    title: 'Import Leads',
    description: 'Bulk create or update leads from Excel / CSV',
    icon: FileSpreadsheet,
  },
  {
    type: 'SITE_VISITS',
    title: 'Import Site Visits',
    description: 'Bulk update site-visit tasks matched by phone',
    icon: MapPin,
  },
  {
    type: 'FOLLOWUPS',
    title: 'Import Follow-ups',
    description: 'Bulk schedule follow-up tasks matched by phone',
    icon: CalendarClock,
  },
] as const;

export function ImportsLandingPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Imports"
        description="Bulk import leads, site visits, and follow-ups"
      />
      <div className="grid gap-3 md:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.type}
              className="flex flex-col rounded-md border border-border bg-surface-raised p-4 shadow-crm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-muted text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-navy">{tile.title}</h3>
              <p className="mt-2 flex-1 text-xs text-muted-foreground">
                {tile.description}
              </p>
              <Button asChild className="mt-4" variant="secondary">
                <Link to={`/admin/imports/${tile.type.toLowerCase()}`}>
                  View history
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
