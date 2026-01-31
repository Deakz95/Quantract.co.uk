import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import * as repo from "@/lib/server/repo";
import { prisma } from "@/lib/server/prisma";

function formatGBP(n: number) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
  } catch {
    return `£${n.toFixed(2)}`;
  }
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { clientId } = await params;
  if (!clientId) {
    throw new Error("Missing clientId");
  }

  const ov = await repo.getClientOverview(clientId);

  if (!ov) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/admin/clients" className="text-sm font-semibold text-[var(--muted-foreground)] underline">
            Back to clients
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { client, quotes, agreements, invoices } = ov;
  const sites = await repo.listSitesForClient(clientId);
  const jobs: Array<{ id: string; title: string | null; status: string; createdAt: Date }> = await prisma.job.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true },
  });
  const contacts: Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; jobTitle: string | null }> = await prisma.contact.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true },
  });
  const siteHistory = await Promise.all(
    sites.map(async (site) => ({
      site,
      certificates: await repo.listCertificatesForSite(site.id),
    }))
  );

  const address = [client.address1, client.address2, client.city, client.county, client.postcode, client.country]
    .filter(Boolean)
    .join(", ");

  const agreementByQuote = new Map(agreements.map((a) => [a.quoteId, a]));

  const breadcrumbItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Clients", href: "/admin/clients" },
    { label: client.name },
  ];

  return (
      <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{client.name}</CardTitle>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">{client.email}</div>
              {client.phone ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">{client.phone}</div> : null}
              {address ? <div className="mt-2 text-xs text-[var(--muted-foreground)]">{address}</div> : null}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/clients">
                <Button variant="secondary" type="button">
                  Back
                </Button>
              </Link>
              <Link href={`/admin/clients/${clientId}/edit`}>
                <Button variant="secondary" type="button">Edit</Button>
              </Link>
              <Link href="/admin/quotes/new">
                <Button type="button">New quote</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)]">No quotes for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2">Quote</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Agreement</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => {
                      const subtotal = q.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
                      const total = subtotal + subtotal * q.vatRate;
                      const ag = agreementByQuote.get(q.id);

                      return (
                        <tr key={q.id} className="border-t border-[var(--border)]">
                          <td className="py-3">
                            <div className="font-semibold text-[var(--foreground)]">{(q as any).quoteNumber || "Quote"}</div>
                            <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{formatDate(q.createdAtISO)}</div>
                          </td>

                          <td className="py-3">
                            <Badge>{q.status}</Badge>
                          </td>

                          <td className="py-3 font-semibold text-[var(--foreground)]">{formatGBP(total)}</td>

                          <td className="py-3">
                            {ag ? <Badge>{ag.status}</Badge> : <span className="text-xs text-[var(--muted-foreground)]">—</span>}
                          </td>

                          <td className="py-3 text-right">
                            <Link href={`/admin/quotes/${q.id}`} className="inline-block">
                              <Button variant="secondary" type="button">
                                Open
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)]">No invoices for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2">Invoice</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Total</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-[var(--border)]">
                        <td className="py-3">
                          <div className="font-semibold text-[var(--foreground)]">{(inv as any).invoiceNumber || "Invoice"}</div>
                          {inv.quoteId ? (
                            <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Quote: {(inv as any).quoteNumber || "Linked"}</div>
                          ) : null}
                        </td>

                        <td className="py-3">
                          <Badge>{inv.status}</Badge>
                        </td>

                        <td className="py-3 font-semibold text-[var(--foreground)]">{formatGBP(inv.total)}</td>

                        <td className="py-3 text-right">
                          <Link href={`/admin/invoices/${inv.id}`}>
                            <Button variant="secondary" type="button">
                              Open
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)]">No jobs for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2">Job</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Date</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id} className="border-t border-[var(--border)]">
                        <td className="py-3">
                          <div className="font-semibold text-[var(--foreground)]">{j.title || "Job"}</div>
                        </td>
                        <td className="py-3"><Badge>{j.status}</Badge></td>
                        <td className="py-3 text-[var(--muted-foreground)]">{formatDate(j.createdAt ? new Date(j.createdAt).toISOString() : "")}</td>
                        <td className="py-3 text-right">
                          <Link href={`/admin/jobs/${j.id}`}>
                            <Button variant="secondary" type="button">Open</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)]">No contacts for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2">Name</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Email</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--border)]">
                        <td className="py-3 font-semibold text-[var(--foreground)]">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
                        <td className="py-3 text-[var(--muted-foreground)]">{c.jobTitle || "—"}</td>
                        <td className="py-3 text-[var(--muted-foreground)]">{c.email || "—"}</td>
                        <td className="py-3 text-right">
                          <Link href={`/admin/contacts/${c.id}`}>
                            <Button variant="secondary" type="button">Open</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          {agreements.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No agreements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--muted-foreground)]">
                    <th className="py-2">Agreement</th>
                    <th className="py-2">Quote</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Signed</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((a) => (
                    <tr key={a.id} className="border-t border-[var(--border)]">
                      <td className="py-3">
                        <div className="font-semibold text-[var(--foreground)]">Agreement</div>
                      </td>

                      <td className="py-3">
                        <Badge>{(a as any).quoteNumber || "Quote"}</Badge>
                      </td>

                      <td className="py-3">
                        <Badge>{a.status}</Badge>
                      </td>

                      <td className="py-3 text-[var(--muted-foreground)]">{formatDate(a.signedAtISO)}</td>

                      <td className="py-3 text-right">
                        <Link href={`/admin/quotes/${a.quoteId}`}>
                          <Button variant="secondary" type="button">
                            Open quote
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site history</CardTitle>
        </CardHeader>
        <CardContent>
          {siteHistory.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No sites recorded for this client yet.</div>
          ) : (
            <div className="space-y-4">
              {siteHistory.map(({ site, certificates }) => {
                const siteAddress = [site.address1, site.address2, site.city, site.county, site.postcode, site.country]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div key={site.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-sm font-semibold text-[var(--foreground)]">{site.name || "Site"}</div>
                    {siteAddress ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">{siteAddress}</div> : null}
                    {certificates.length === 0 ? (
                      <div className="mt-3 text-sm text-[var(--muted-foreground)]">No certificates yet.</div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {certificates.map((cert) => (
                          <div key={cert.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[var(--foreground)]">{cert.type} • {(cert as any).certificateNumber || `#${cert.id.slice(0, 8)}`}</div>
                              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                                Status: {cert.status}
                                {cert.issuedAtISO ? ` • Issued ${formatDate(cert.issuedAtISO)}` : ""}
                                {!cert.issuedAtISO && cert.completedAtISO ? ` • Completed ${formatDate(cert.completedAtISO)}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Link href={`/admin/certificates/${cert.id}`} className="font-semibold text-[var(--foreground)] hover:underline">
                                Open
                              </Link>
                              {cert.pdfKey ? (
                                <a href={`/api/admin/certificates/${cert.id}/pdf`} className="font-semibold text-[var(--foreground)] hover:underline" target="_blank" rel="noreferrer">
                                  PDF
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
  );
}
