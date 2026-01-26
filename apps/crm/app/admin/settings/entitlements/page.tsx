import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { EntitlementsSettings } from "@/components/admin/settings/EntitlementsSettings";

export default function EntitlementsSettingsPage() {
  return (
    <AdminSettingsShell title="Entitlements" subtitle="View your plan limits and current usage.">
      <EntitlementsSettings />
    </AdminSettingsShell>
  );
}
