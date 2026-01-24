import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as repo from "@/lib/server/repo";

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
          <Link href="/admin/clients" className="text-sm font-semibold text-slate-700 underline">
            Back to clients
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { client, quotes, agreements, invoices } = ov;
  const sites = await repo.listSitesForClient(clientId);
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

  return (
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{client.name}</CardTitle>
              <div className="mt-1 text-sm text-slate-700">{client.email}</div>
              {client.phone ? <div className="mt-1 text-xs text-slate-600">{client.phone}</div> : null}
              {address ? <div className="mt-2 text-xs text-slate-600">{address}</div> : null}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/clients">
                <Button variant="secondary" type="button">
                  Back
                </Button>
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
              <div className="text-sm text-slate-600">No quotes for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-600">
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
                        <tr key={q.id} className="border-t border-slate-100">
                          <td className="py-3">
                            <div className="font-semibold text-slate-900">{q.id.slice(0, 8)}</div>
                            <div className="mt-0.5 text-xs text-slate-600">{formatDate(q.createdAtISO)}</div>
                          </td>

                          <td className="py-3">
                            <Badge>{q.status}</Badge>
                          </td>

                          <td className="py-3 font-semibold text-slate-900">{formatGBP(total)}</td>

                          <td className="py-3">
                            {ag ? <Badge>{ag.status}</Badge> : <span className="text-xs text-slate-500">—</span>}
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
              <div className="text-sm text-slate-600">No invoices for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-600">
                      <th className="py-2">Invoice</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Total</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-slate-100">
                        <td className="py-3">
                          <div className="font-semibold text-slate-900">{inv.id.slice(0, 8)}</div>
                          {inv.quoteId ? (
                            <div className="mt-0.5 text-xs text-slate-600">Quote: {inv.quoteId.slice(0, 8)}</div>
                          ) : null}
                        </td>

                        <td className="py-3">
                          <Badge>{inv.status}</Badge>
                        </td>

                        <td className="py-3 font-semibold text-slate-900">{formatGBP(inv.total)}</td>

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

      <Card>
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          {agreements.length === 0 ? (
            <div className="text-sm text-slate-600">No agreements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-600">
                    <th className="py-2">Agreement</th>
                    <th className="py-2">Quote</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Signed</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="py-3">
                        <div className="font-semibold text-slate-900">{a.id.slice(0, 8)}</div>
                      </td>

                      <td className="py-3">
                        <Badge>{a.quoteId.slice(0, 8)}</Badge>
                      </td>

                      <td className="py-3">
                        <Badge>{a.status}</Badge>
                      </td>

                      <td className="py-3 text-slate-700">{formatDate(a.signedAtISO)}</td>

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
            <div className="text-sm text-slate-600">No sites recorded for this client yet.</div>
          ) : (
            <div className="space-y-4">
              {siteHistory.map(({ site, certificates }) => {
                const siteAddress = [site.address1, site.address2, site.city, site.county, site.postcode, site.country]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div key={site.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">{site.name || "Site"}</div>
                    {siteAddress ? <div className="mt-1 text-xs text-slate-600">{siteAddress}</div> : null}
                    {certificates.length === 0 ? (
                      <div className="mt-3 text-sm text-slate-600">No certificates yet.</div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {certificates.map((cert) => (
                          <div key={cert.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">{cert.type} • {cert.id}</div>
                              <div className="mt-1 text-xs text-slate-600">
                                Status: {cert.status}
                                {cert.issuedAtISO ? ` • Issued ${formatDate(cert.issuedAtISO)}` : ""}
                                {!cert.issuedAtISO && cert.completedAtISO ? ` • Completed ${formatDate(cert.completedAtISO)}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Link href={`/admin/certificates/${cert.id}`} className="font-semibold text-slate-900 hover:underline">
                                Open
                              </Link>
                              {cert.pdfKey ? (
                                <a href={`/api/admin/certificates/${cert.id}/pdf`} className="font-semibold text-slate-900 hover:underline" target="_blank" rel="noreferrer">
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
