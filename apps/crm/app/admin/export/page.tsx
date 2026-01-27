import { AppShell } from "@/components/AppShell";
import { ExportPageClient } from "@/components/admin/export/ExportPageClient";

export default function AdminExportPage() {
  return (
    <AppShell
      role="admin"
      title="Export Data"
      subtitle="Download your contacts, clients, and deals as CSV files."
    >
      <ExportPageClient />
    </AppShell>
  );
}
