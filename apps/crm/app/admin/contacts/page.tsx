import { AppShell } from "@/components/AppShell";
import ContactsPageClient from "@/components/admin/contacts/ContactsPageClient";

export default function AdminContactsPage() {
  return (
    <AppShell role="admin" title="Contacts" subtitle="Manage contacts and their relationships with clients.">
      <ContactsPageClient />
    </AppShell>
  );
}
