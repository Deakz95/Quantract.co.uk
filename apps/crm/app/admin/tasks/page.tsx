import { AppShell } from "@/components/AppShell";
import TasksPageClient from "@/components/admin/tasks/TasksPageClient";

export default function AdminTasksPage() {
  return (
    <AppShell role="admin" title="Tasks" subtitle="Manage tasks and assignments.">
      <TasksPageClient />
    </AppShell>
  );
}
