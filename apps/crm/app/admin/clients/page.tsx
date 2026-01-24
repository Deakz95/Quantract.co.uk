import { AppShell } from "@/components/AppShell";
import ClientsPageClient from "@/components/admin/clients/ClientsPageClient";

export default function AdminClientsPage() {
  return (
    <AppShell role="admin" title="Clients" subtitle="Manage client details, sites and history.">
      <ClientsPageClient />
    </AppShell>
  );
}
