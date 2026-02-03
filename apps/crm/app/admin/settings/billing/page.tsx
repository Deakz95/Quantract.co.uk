"use client";

import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { BillingSettings } from "@/components/admin/settings/BillingSettings";

export default function BillingSettingsPage() {
  return (
    <AdminSettingsShell title="Billing" subtitle="Manage your subscription and plan">
      <BillingSettings />
    </AdminSettingsShell>
  );
}
