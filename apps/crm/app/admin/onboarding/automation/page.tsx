"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OnboardingAutomationPage() {
  return (
    <AppShell role="admin" title="Onboarding automation" subtitle="Invite teams, prefill signup, and speed up address entry." hideNav>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Phase 4 wireframes</CardTitle>
              <Badge>Automation</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                <div className="text-sm font-semibold text-[var(--foreground)]">Role-based admin invites</div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Invite admins, engineers and clients with the right permissions.</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/admin/invites">
                    <Button type="button" variant="secondary">Open invites</Button>
                  </Link>
                  <Button type="button" variant="secondary" onClick={() => document.getElementById("invite-wireframe")?.scrollIntoView({ behavior: "smooth" })}>
                    View wireframe
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                <div className="text-sm font-semibold text-[var(--foreground)]">Pre-filled registration</div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Pass name, email, role, and company details from the invite link.</div>
                <div className="mt-4">
                  <Button type="button" variant="secondary" onClick={() => document.getElementById("prefill-wireframe")?.scrollIntoView({ behavior: "smooth" })}>
                    View wireframe
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm sm:col-span-2">
                <div className="text-sm font-semibold text-[var(--foreground)]">Address autofill</div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Type a postcode, pick the address, and fill site/client fields instantly.</div>
                <div className="mt-4">
                  <Button type="button" variant="secondary" onClick={() => document.getElementById("address-wireframe")?.scrollIntoView({ behavior: "smooth" })}>
                    View wireframe
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wireframes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <section id="invite-wireframe" className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--foreground)]">Role-based invites</div>
                  <Badge>UI</Badge>
                </div>
                <div className="mt-3 grid gap-3">
                  <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  <div className="h-16 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                </div>
                <div className="mt-3 text-xs text-[var(--muted-foreground)]">Fields: email, role, optional project/site, expiry, send invite.</div>
              </section>

              <section id="prefill-wireframe" className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--foreground)]">Pre-filled registration</div>
                  <Badge>UI</Badge>
                </div>
                <div className="mt-3 grid gap-3">
                  <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                </div>
                <div className="mt-3 text-xs text-[var(--muted-foreground)]">Auto-populate name/email/role; only ask for password + consent.</div>
              </section>

              <section id="address-wireframe" className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--foreground)]">Address autofill</div>
                  <Badge>UI</Badge>
                </div>
                <div className="mt-3 grid gap-3">
                  <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  <div className="h-28 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                </div>
                <div className="mt-3 text-xs text-[var(--muted-foreground)]">Postcode lookup dropdown → fills address fields.</div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
