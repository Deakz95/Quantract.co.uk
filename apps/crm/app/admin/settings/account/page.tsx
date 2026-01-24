import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { PasswordChangeCard } from "@/components/admin/PasswordChangeCard";

export default function AccountSettingsPage() {
  return (
    <AdminSettingsShell title="Account" subtitle="Password, sign-in, and security.">
      <div className="space-y-6">
        <PasswordChangeCard />
      </div>
    </AdminSettingsShell>
  );
}
