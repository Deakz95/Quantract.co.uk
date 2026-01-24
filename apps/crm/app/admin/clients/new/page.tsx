import { AppShell } from "@/components/AppShell";
import ClientCreatePageClient from "@/components/admin/clients/ClientCreatePageClient";

export default function AdminClientNewPage() {
  return (
    <AppShell role="admin" title="Create client" subtitle="Add a new client (mobile-friendly).">
      <ClientCreatePageClient />
    </AppShell>
  );
}
