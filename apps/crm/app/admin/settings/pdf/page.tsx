import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";

export default function PdfSettingsPage() {
  return (
    <AdminSettingsShell title="PDF customiser" subtitle="Configure footers and template branding.">
      <CompanySettingsForm mode="settings" />
    </AdminSettingsShell>
  );
}
