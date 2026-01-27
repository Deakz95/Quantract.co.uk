import { AppShell } from "@/components/AppShell";
import KanbanBoard from "@/components/admin/deals/KanbanBoard";

export default function AdminDealsPage() {
  return (
    <AppShell role="admin" title="Deals" subtitle="Manage your sales pipeline with drag-and-drop.">
      <KanbanBoard />
    </AppShell>
  );
}
