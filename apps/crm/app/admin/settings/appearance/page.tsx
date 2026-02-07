import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";

export default function AppearanceSettingsPage() {
  return (
    <AdminSettingsShell title="Appearance" subtitle="Customise your brand colours and visual identity">
      <CompanySettingsForm mode="settings" section="appearance" />
    </AdminSettingsShell>
  );
}
