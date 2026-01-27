"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";

export default function ClientCreatePageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n) {
  toast({ title: "Missing name", description: "Name is required.", variant: "destructive" });
  return;
}
if (!e || !e.includes("@")) {
  toast({ title: "Invalid email", description: "Valid email is required.", variant: "destructive" });
  return;
}


    setBusy(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n, email: e, phone: phone.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create client");

      toast({
        title: "Client created",
        description: "The client has been created successfully.",
        variant: "success",
     });

      router.push(`/admin/clients/${data.client.id}`);
    } catch (err: any) {
      toast({
         title: "Error",
         description: err?.message || "Failed to create client.",
         variant: "destructive",
     });

    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Full name <span className="text-red-500">*</span></span>
              <input className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" value={name} onChange={(e) => setName(e.target.value)} name="name" placeholder="e.g. Jane Doe" />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Email <span className="text-red-500">*</span></span>
              <input className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" value={email} onChange={(e) => setEmail(e.target.value)} name="email" placeholder="jane@example.com" />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Phone (optional)</span>
              <input className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" />
            </label>

            <div className="flex items-center gap-2">
              <Button type="button" disabled={busy} onClick={submit}>
                {busy ? "Saving…" : "Create client"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/admin/clients")}>
                Cancel
              </Button>
            </div>

            <div className="text-xs text-[var(--muted-foreground)]">
              Next: you can add quotes, jobs, and invoices from the client detail page.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
