import { AppShell } from "@/components/AppShell";
import ChecklistTemplatesPageClient from "@/components/admin/checklists/ChecklistTemplatesPageClient";

export default function AdminChecklistTemplatesPage() {
  return (
    <AppShell role="admin" title="Checklist Templates" subtitle="Manage compliance checklist templates for jobs.">
      <ChecklistTemplatesPageClient />
    </AppShell>
  );
}
