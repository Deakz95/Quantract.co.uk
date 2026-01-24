// src/lib/docPack.ts
export type PackItem = {
  key: string;
  label: string;
  status: "ready" | "missing";
};

export function buildSignedPackItems({
  hasQuotePdf,
  hasAgreementPdf,
  hasTermsPdf,
  hasCertificate,
}: {
  hasQuotePdf: boolean;
  hasAgreementPdf: boolean;
  hasTermsPdf: boolean;
  hasCertificate: boolean;
}): PackItem[] {
  return [
    { key: "quote", label: "Quote PDF", status: hasQuotePdf ? "ready" : "missing" },
    { key: "agreement", label: "Agreement PDF", status: hasAgreementPdf ? "ready" : "missing" },
    { key: "terms", label: "Terms & Conditions (snapshot)", status: hasTermsPdf ? "ready" : "missing" },
    { key: "certificate", label: "Signing Certificate", status: hasCertificate ? "ready" : "missing" },
  ];
}
