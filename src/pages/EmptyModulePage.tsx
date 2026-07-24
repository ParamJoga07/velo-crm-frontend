import { PageHeader } from '@/components/PageHeader';

/** Empty operational screens for modules not yet fully specified — no fake rows. */
export function EmptyModulePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />
      <div className="rounded-md border border-border bg-surface-raised p-8 text-sm text-muted-foreground shadow-panel">
        No records to show. This module will list live data once you create
        jobs or records here.
      </div>
    </div>
  );
}
