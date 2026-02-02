import Link from "next/link";
import type { Metadata } from "next";
import * as repo from "@/lib/server/repo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { token } = await params;
  if (!token) {
    throw new Error("Missing token");
  }
  const a = await repo.getAgreementByToken(token);
  if (!a) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Certificate not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">This link is invalid or has been revoked.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (a.status !== "signed") {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Not signed yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">The agreement must be signed before a certificate is available.</p>
            <div className="mt-4">
              <Link href={`/client/agreements/${token}`}>
                <Button>Back to agreement</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Signature certificate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[var(--muted-foreground)]">
            This certificate is tied to a private signing link. Keep it secure if you share it with third parties.
          </div>
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">Agreement Ref:</span> {(a as any).agreementNumber || "Agreement"}</div>
            <div><span className="font-semibold">Quote Ref:</span> {(a as any).quoteNumber || "Quote"}</div>
            <div><span className="font-semibold">Signed at:</span> {a.signedAtISO ? new Date(a.signedAtISO).toLocaleString("en-GB") : ""}</div>
            <div><span className="font-semibold">Signer:</span> {a.signerName}</div>
            {a.signerEmail ? <div><span className="font-semibold">Email:</span> {a.signerEmail}</div> : null}
            {a.signerIp ? <div><span className="font-semibold">IP:</span> {a.signerIp}</div> : null}
            {a.signerUserAgent ? <div><span className="font-semibold">User-Agent:</span> {String(a.signerUserAgent)}</div> : null}
            {a.certificateHash ? (
              <div className="pt-2">
                <div className="font-semibold">Certificate hash (SHA-256)</div>
                <div className="mt-1 break-all rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 font-mono text-xs text-[var(--foreground)]">
                  {a.certificateHash}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a href={`/api/client/agreements/${token}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Download agreement PDF</Button>
            </a>
            <Link href={`/client/agreements/${token}`}>
              <Button>Back to agreement</Button>
            </Link>
            <Link href="/client/invoices">
              <Button variant="secondary">View invoices</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
