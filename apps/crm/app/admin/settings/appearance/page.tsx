import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";

export default function AppearanceSettingsPage() {
  return (
    <AdminSettingsShell title="Appearance" subtitle="Customize your brand colors and visual identity">
      <CompanySettingsForm mode="settings" />
    </AdminSettingsShell>
  );
}
