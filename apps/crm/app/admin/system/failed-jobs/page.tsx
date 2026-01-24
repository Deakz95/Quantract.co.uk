import { AppShell } from "@/components/AppShell";
import FailedJobsPageClient from "@/components/admin/system/FailedJobsPageClient";

export default function FailedJobsPage() {
  return (
    <AppShell
      role="admin"
      title="Failed Background Jobs"
      subtitle="Monitor and retry failed asynchronous jobs."
    >
      <FailedJobsPageClient />
    </AppShell>
  );
}
