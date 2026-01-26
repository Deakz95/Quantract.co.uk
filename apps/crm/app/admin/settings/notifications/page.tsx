import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { NotificationsSettings } from "@/components/admin/settings/NotificationsSettings";

export default function NotificationsSettingsPage() {
  return (
    <AdminSettingsShell
      title="Notifications"
      subtitle="Configure SMS notifications, templates, and delivery settings."
    >
      <NotificationsSettings />
    </AdminSettingsShell>
  );
}
