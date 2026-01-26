import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { LegalEntitiesSettings } from "@/components/admin/settings/LegalEntitiesSettings";

export default function LegalEntitiesSettingsPage() {
  return (
    <AdminSettingsShell title="Legal Entities" subtitle="Manage your billing entities for multi-company invoicing.">
      <LegalEntitiesSettings />
    </AdminSettingsShell>
  );
}
