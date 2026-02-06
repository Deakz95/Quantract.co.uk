import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/server/prisma";
import { createSignedUrl } from "@/lib/server/documents";
import { readUploadBytes } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: "noindex, nofollow",
};

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ info?: string }>;
};

export default async function QrResolvePage({ params, searchParams }: Props) {
  const { code } = await params;
  const { info } = await searchParams;

  // Validate code format: must be 32-char hex (128-bit)
  if (!/^[0-9a-f]{32}$/i.test(code)) {
    notFound();
  }

  // Rate limiting is handled at the edge in middleware.ts (30/min per IP)

  // Look up QR tag — exclude revoked (return same 404 as non-existent)
  const prisma = getPrisma();
  if (!prisma) notFound();

  const tag = await prisma.qrTag.findUnique({
    where: { code: code.toLowerCase() },
    select: {
      id: true,
      status: true,
      company: {
        select: {
          brandName: true,
          logoKey: true,
          themePrimary: true,
          themeAccent: true,
        },
      },
      assignment: {
        select: {
          documentId: true,
          certificateId: true,
          certificate: {
            select: {
              id: true,
              certificateNumber: true,
              type: true,
              issuedAt: true,
              outcome: true,
            },
          },
        },
      },
    },
  });

  // Revoked or non-existent — identical 404 (no status oracle)
  if (!tag || tag.status === "revoked") {
    notFound();
  }

  // Tag exists but not yet assigned
  if (!tag.assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">🏷️</div>
          <h1 className="text-lg font-bold text-gray-900">Tag not yet assigned</h1>
          <p className="mt-2 text-sm text-gray-500">
            This QR tag has not been linked to a certificate yet.
          </p>
        </div>
      </div>
    );
  }

  // Resolve the document ID
  let documentId = tag.assignment.documentId;

  // If assignment has certificateId but no direct documentId,
  // find the Document via the certificate's pdfKey → Document.storageKey
  if (!documentId && tag.assignment.certificateId) {
    const cert = await prisma.certificate.findUnique({
      where: { id: tag.assignment.certificateId },
      select: { pdfKey: true, companyId: true },
    });

    if (cert?.pdfKey) {
      const doc = await prisma.document.findFirst({
        where: {
          companyId: cert.companyId,
          storageKey: cert.pdfKey,
        },
        select: { id: true },
      });
      documentId = doc?.id ?? null;
    }
  }

  // No document found for this tag
  if (!documentId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">📄</div>
          <h1 className="text-lg font-bold text-gray-900">Certificate pending</h1>
          <p className="mt-2 text-sm text-gray-500">
            The certificate for this tag is being processed. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Generate signed URL for the document (5-min TTL)
  const signedUrl = createSignedUrl(documentId);

  // Default: immediate redirect to PDF (fastest scan-to-view)
  // ?info=1 shows branded landing page instead
  if (info !== "1") {
    redirect(signedUrl);
  }

  // Branded landing page
  const cert = tag.assignment.certificate;
  const brandName = tag.company.brandName;
  const brandPrimary = tag.company.themePrimary || "#0f172a";
  const brandAccent = tag.company.themeAccent || "#16a34a";

  // Resolve company logo as base64 data URI for inline rendering
  let logoDataUri: string | null = null;
  if (tag.company.logoKey) {
    try {
      const logoBytes = readUploadBytes(tag.company.logoKey);
      if (logoBytes) {
        const ext = tag.company.logoKey.toLowerCase().endsWith(".svg") ? "svg+xml" : "png";
        logoDataUri = `data:image/${ext};base64,${logoBytes.toString("base64")}`;
      }
    } catch {
      // non-fatal — no logo shown
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Branded header with logo and company colors */}
        <div className="text-center mb-6">
          {logoDataUri && (
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoDataUri}
                alt={brandName}
                className="max-h-16 max-w-[200px] object-contain"
              />
            </div>
          )}
          <h1 className="text-xl font-bold" style={{ color: brandPrimary }}>
            {brandName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Certificate Verification</p>
          {/* Accent bar */}
          <div
            className="mt-3 mx-auto h-0.5 w-16 rounded-full"
            style={{ backgroundColor: brandAccent }}
          />
        </div>

        {cert && (
          <div className="space-y-3 mb-6">
            {/* Status badge */}
            <div className="flex justify-center mb-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: cert.outcome === "satisfactory" ? "#dcfce7" : cert.outcome === "unsatisfactory" ? "#fef2f2" : "#f3f4f6",
                  color: cert.outcome === "satisfactory" ? "#166534" : cert.outcome === "unsatisfactory" ? "#991b1b" : "#374151",
                }}
              >
                {cert.outcome === "satisfactory" ? "Satisfactory" : cert.outcome === "unsatisfactory" ? "Unsatisfactory" : "Issued"}
              </span>
            </div>
            {cert.certificateNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Certificate No.</span>
                <span className="font-medium text-gray-900">{cert.certificateNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900">{cert.type}</span>
            </div>
            {cert.issuedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Issued</span>
                <span className="font-medium text-gray-900">
                  {new Date(cert.issuedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {cert.outcome && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Outcome</span>
                <span className="font-medium text-gray-900">{cert.outcome}</span>
              </div>
            )}
          </div>
        )}

        <a
          href={signedUrl}
          className="block w-full text-center py-3 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-colors"
          style={{ backgroundColor: brandPrimary }}
        >
          View Certificate PDF
        </a>

        {cert && (
          <a
            href={`/client/certificates/${cert.id}`}
            className="mt-2 block w-full text-center py-3 px-4 rounded-lg border text-sm font-semibold hover:bg-gray-50 transition-colors"
            style={{ borderColor: brandPrimary, color: brandPrimary }}
          >
            View in Portal
          </a>
        )}

        <p className="mt-4 text-xs text-gray-400 text-center">
          This link expires in 5 minutes for security.
        </p>
      </div>
    </div>
  );
}
