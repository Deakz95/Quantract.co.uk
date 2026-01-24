import CertificateEditorClient from "@/components/certificates/CertificateEditorClient";

type Props = {
  params: Promise<{ certificateId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EngineerCertificatePage({ params }: Props) {
  const { certificateId } = await params;

  if (!certificateId) {
    return <div className="text-sm text-slate-700">Certificate not found.</div>;
  }

  return <CertificateEditorClient certificateId={certificateId} mode="engineer" />;
}
