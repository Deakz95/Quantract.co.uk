import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { LeadCaptureSettings } from "@/components/admin/settings/LeadCaptureSettings";

export default function LeadCaptureSettingsPage() {
  return (
    <AdminSettingsShell
      title="Lead Capture"
      subtitle="Configure website form integration, API keys, and allowed domains."
    >
      <LeadCaptureSettings />
    </AdminSettingsShell>
  );
}
