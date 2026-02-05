"use client";

import { AppShell } from "@/components/AppShell";
import { EntitlementsSettings } from "@/components/admin/settings/EntitlementsSettings";

export default function EntitlementsPage() {
  return (
    <AppShell role="admin" title="Entitlements" subtitle="Plan limits, usage counters, and overrides.">
      <EntitlementsSettings />
    </AppShell>
  );
}
