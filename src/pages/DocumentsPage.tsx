import { PageHeader } from '@/components/PageHeader';
import { DocumentLibrary } from '@/components/DocumentLibrary';

export function DocumentsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        description="Company files. Employee KYC and HR files live on each person in HRMS."
      />
      <DocumentLibrary scope="company" />
    </div>
  );
}
