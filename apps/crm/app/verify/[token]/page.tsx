import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/server/prisma";
import { getCertTypeMetadata } from "@/lib/server/certs/types";
import type { Metadata } from "next";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = {
  title: "Verify Certificate | Quantract",
  description: "Verify the authenticity of an issued certificate",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export default async function VerifyPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const prisma = getPrisma();
  if (!prisma) notFound();

  // Lookup by verification token only — no company scoping needed (token is unique + non-guessable)
  const cert = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    select: {
      id: true,
      type: true,
      status: true,
      certificateNumber: true,
      outcome: true,
      outcomeReason: true,
      verificationRevokedAt: true,
      verificationRevokedReason: true,
      currentRevision: true,
      companyId: true,
    },
  });

  if (!cert) notFound();
  if (cert.status !== "issued") notFound();

  // Load company name
  const company = await prisma.company.findUnique({
    where: { id: cert.companyId },
    select: { brandName: true },
  });

  // Load latest revision (extended fields for trust signals)
  const latestRevision = await prisma.certificateRevision.findFirst({
    where: { certificateId: cert.id },
    orderBy: { revision: "desc" },
    select: {
      revision: true,
      signingHash: true,
      issuedAt: true,
      pdfChecksum: true,
      pdfGeneratedAt: true,
      content: true,
    },
  });

  if (!latestRevision) notFound();

  // Extract address from canonical snapshot
  const content = latestRevision.content as any;
  const address = content?.data?.overview?.installationAddress
    || content?.data?.overview?.siteAddress
    || "";

  const typeMeta = getCertTypeMetadata(cert.type);
  const isRevoked = !!cert.verificationRevokedAt;
  const companyName = company?.brandName || "—";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-lg">
        <div className="bg-[var(--card)] rounded-2xl shadow-xl p-8 border border-[var(--border)]">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg mb-3">
              <span className="text-white font-bold text-xl">Q</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Certificate Verification</h1>
          </div>

          {/* Revoked banner */}
          {isRevoked && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 font-semibold text-sm">Verification Revoked</p>
              <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                This certificate&apos;s verification was revoked on{" "}
                {new Date(cert.verificationRevokedAt!).toLocaleDateString("en-GB")}.
              </p>
              {cert.verificationRevokedReason && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  Reason: {cert.verificationRevokedReason}
                </p>
              )}
            </div>
          )}

          {/* Verified banner */}
          {!isRevoked && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Certificate Verified
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                This certificate has been verified as authentic and currently issued.
              </p>
            </div>
          )}

          {/* Certificate details */}
          <div className="space-y-3 text-sm">
            <Row label="Certificate Type" value={typeMeta?.displayName || cert.type} />
            <Row label="Certificate No" value={cert.certificateNumber || "—"} />
            <Row label="Issued By" value={companyName} />
            <Row label="Issued" value={latestRevision.issuedAt ? new Date(latestRevision.issuedAt).toLocaleDateString("en-GB") : "—"} />
            {address && <Row label="Installation Address" value={address} />}
            {cert.outcome && (
              <Row
                label="Outcome"
                value={cert.outcome.charAt(0).toUpperCase() + cert.outcome.slice(1)}
              />
            )}
            {cert.outcomeReason && (
              <div className="pt-1">
                <p className="text-[var(--muted-foreground)] text-xs">{cert.outcomeReason}</p>
              </div>
            )}
          </div>

          {/* Trust Signals Panel */}
          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Integrity Details</h2>
            <div className="space-y-3 text-sm">
              <Row label="Revision" value={`Rev ${latestRevision.revision}`} />

              {/* Digital Signature with copy */}
              {latestRevision.signingHash && (
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--muted-foreground)] shrink-0" title="This hash uniquely identifies the signed contents of this certificate.">
                    Digital Signature
                  </span>
                  <span className="flex items-center gap-0.5 text-[var(--foreground)] text-right font-mono text-xs">
                    {truncateHash(latestRevision.signingHash)}
                    <CopyButton value={latestRevision.signingHash} />
                  </span>
                </div>
              )}

              {latestRevision.pdfGeneratedAt && (
                <Row
                  label="PDF Generated"
                  value={new Date(latestRevision.pdfGeneratedAt).toLocaleDateString("en-GB")}
                />
              )}

              {/* PDF Checksum (audit detail) */}
              {latestRevision.pdfChecksum && (
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--muted-foreground)] shrink-0" title="Used by auditors to verify the downloaded PDF has not been altered.">
                    PDF Checksum
                  </span>
                  <span className="flex items-center gap-0.5 text-[var(--foreground)] text-right font-mono text-xs">
                    {truncateHash(latestRevision.pdfChecksum)}
                    <CopyButton value={latestRevision.pdfChecksum} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Integrity Explanation */}
          <div className="mt-4 p-3 rounded-lg bg-[var(--accent)] text-xs text-[var(--muted-foreground)] leading-relaxed">
            This certificate is digitally sealed. Any change to its contents would
            create a new revision with a different signature. You can use the
            revision number and digital signature to confirm authenticity.
          </div>

          {/* PDF download */}
          {!isRevoked && (
            <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2">
              <a
                href={`/verify/${token}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Download Certificate PDF
              </a>
              <a
                href={`/verify/${token}/json`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2 px-4 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-xs font-medium hover:bg-[var(--accent)] transition-colors"
              >
                Download verification record (JSON)
              </a>
            </div>
          )}

          {isRevoked && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                Downloads are unavailable for revoked certificates.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
            Verified by Quantract &bull; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--muted-foreground)] shrink-0">{label}</span>
      <span className={`text-[var(--foreground)] text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
