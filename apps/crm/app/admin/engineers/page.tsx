import { AppShell } from "@/components/AppShell";
import EngineersPageClient from "@/components/admin/engineers/EngineersPageClient";

export default function AdminEngineersPage() {
  return (
    <AppShell role="admin" title="Engineers" subtitle="Manage engineers and assignments.">
      <EngineersPageClient />
    </AppShell>
  );
}
