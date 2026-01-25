// app/engineer/jobs/[jobId]/page.tsx

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound, redirect } from "next/navigation";
import { getSession, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import EngineerVariationForm from "@/components/engineer/EngineerVariationForm";
import EngineerSnagCard from "@/components/engineer/EngineerSnagCard";
import { cookies } from "next/headers";

function pounds(value: number) {
  return `£${Number(value || 0).toFixed(2)}`;
}

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { jobId } = await params;
  if (!jobId) {
    throw new Error("Missing jobId");
  }

  const sid = cookies().get("qt_sid_v1")?.value;
  const session = sid ? await getSession(sid) : null;
  if (!session || session.user.role !== "engineer") {
    redirect("/engineer/login");
  }
  const email = await getUserEmail();
  if (!email) {
    redirect("/engineer/login");
  }

  const job = await repo.getJobForEngineer(jobId, email);
  if (!job) notFound();
  const quote = job.quoteId ? await repo.getQuoteById(job.quoteId) : null;
  const agreement = job.quoteId ? await repo.getAgreementForQuote(job.quoteId) : null;
  const stages = await repo.listJobStages(jobId);
  const variations = await repo.listVariationsForJob(jobId);
  const certs = await repo.listCertificatesForJob(jobId);

  return (
      <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{job.title || `Job ${job.id}`}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">Assigned</Badge>
              <Badge>{job.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">
            <div className="font-semibold text-[var(--foreground)]">Status: {job.status}</div>
            <div className="mt-2">
              {job.siteName || job.siteAddress ? (
                <div>
                  <span className="font-semibold">Site:</span> {job.siteName ? `${job.siteName} • ` : ""}{job.siteAddress}
                </div>
              ) : null}
              {job.clientName ? (
                <div className="mt-1"><span className="font-semibold">Client:</span> {job.clientName}</div>
              ) : null}
              {job.scheduledAtISO ? (
                <div className="mt-1"><span className="font-semibold">Scheduled:</span> {new Date(job.scheduledAtISO).toLocaleString("en-GB")}</div>
              ) : null}
              {job.notes ? (
                <div className="mt-1"><span className="font-semibold">Notes:</span> {job.notes}</div>
              ) : null}
            </div>
            <div className="mt-3 text-[var(--muted-foreground)]">
              Checklist, photos, notes, and completion actions can be added next (Pack C2/C3).
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary">Upload photos</Button>
            <Button variant="secondary">Add note</Button>
            <Button>Mark complete</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <CardContent>
          {quote ? (
            <div className="space-y-4">
              {quote.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[var(--muted-foreground)]">
                        <th className="py-2 pr-3">Description</th>
                        <th className="py-2 pr-3">Qty</th>
                        <th className="py-2 pr-3">Unit</th>
                        <th className="py-2 pr-0 text-right">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item) => (
                        <tr key={item.id} className="border-t border-[var(--border)]">
                          <td className="py-3 pr-3">{item.description}</td>
                          <td className="py-3 pr-3">{item.qty}</td>
                          <td className="py-3 pr-3">{pounds(item.unitPrice)}</td>
                          <td className="py-3 pr-0 text-right">{pounds(item.qty * item.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted-foreground)]">No scope items captured yet.</div>
              )}
              {quote.notes ? (
                <div>
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                    {quote.notes}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">Scope details are not available yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div>
                <div className="font-semibold text-[var(--foreground)]">Quote PDF</div>
                <div className="text-xs text-[var(--muted-foreground)]">{quote ? "Ready" : "Not available"}</div>
              </div>
              {quote?.token ? (
                <a className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/api/client/quotes/${quote.token}/pdf`} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div>
                <div className="font-semibold text-[var(--foreground)]">Agreement</div>
                <div className="text-xs text-[var(--muted-foreground)]">{agreement ? `Status: ${agreement.status}` : "Not created"}</div>
              </div>
              {agreement?.token ? (
                <a className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/api/client/agreements/${agreement.token}/pdf`} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stages</CardTitle>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No stages set up yet.</div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage) => (
                <div key={stage.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <div className="font-semibold text-[var(--foreground)]">{stage.name}</div>
                  <Badge>{stage.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variations</CardTitle>
        </CardHeader>
        <CardContent>
          {variations.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No variations raised yet.</div>
          ) : (
            <div className="space-y-2">
              {variations.map((variation) => (
                <div key={variation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--foreground)]">{variation.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {variation.stageName ? `${variation.stageName} • ` : ""}{variation.status} • {pounds(variation.total)}
                    </div>
                  </div>
                  <Badge>{variation.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EngineerVariationForm jobId={jobId} stages={stages} />

      <EngineerSnagCard jobId={jobId} />

      <Card>
        <CardHeader>
          <CardTitle>Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No certificates assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {certs.map((cert) => (
                <div key={cert.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--foreground)]">{cert.type} • {cert.id}</div>
                      <Badge>{cert.status}</Badge>
                    </div>
                    {cert.completedAtISO ? (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">Completed {new Date(cert.completedAtISO).toLocaleString("en-GB")}</div>
                    ) : null}
                  </div>
                  <Link className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/engineer/certificates/${cert.id}`}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
  );
}
