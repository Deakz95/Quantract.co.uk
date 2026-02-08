import { AppShell } from "@/components/AppShell";
import CertificateReviewQueueClient from "@/components/admin/certificates/CertificateReviewQueueClient";

export default function AdminCertificateReviewPage() {
  return (
    <AppShell role="admin" title="Certificate Reviews" subtitle="Review and approve certificates submitted by engineers.">
      <CertificateReviewQueueClient />
    </AppShell>
  );
}
