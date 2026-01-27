import { AppShell } from "@/components/AppShell";
import { ImportWizard } from "@/components/admin/import/ImportWizard";

export default function AdminImportPage() {
  return (
    <AppShell
      role="admin"
      title="Import Data"
      subtitle="Upload CSV or Excel files to import contacts, clients, or deals."
    >
      <ImportWizard />
    </AppShell>
  );
}
