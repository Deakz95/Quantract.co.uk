import { AppShell } from "@/components/AppShell";
import EngineerProfileClient from "./EngineerProfileClient";

export default function EngineerProfilePage() {
  return (
    <AppShell role="admin" title="Engineer Profile" subtitle="View and manage engineer details.">
      <EngineerProfileClient />
    </AppShell>
  );
}
