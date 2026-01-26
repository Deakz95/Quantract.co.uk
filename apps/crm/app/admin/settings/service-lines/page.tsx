import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { ServiceLinesSettings } from "@/components/admin/settings/ServiceLinesSettings";

export default function ServiceLinesSettingsPage() {
  return (
    <AdminSettingsShell title="Service Lines" subtitle="Define service categories and link them to billing entities.">
      <ServiceLinesSettings />
    </AdminSettingsShell>
  );
}
