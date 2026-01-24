import { AppShell } from "@/components/AppShell";
import CertificatesPageClient from "@/components/admin/certificates/CertificatesPageClient";

export default function AdminCertificatesPage() {
  return (
    <AppShell role="admin" title="Certificates" subtitle="Generate and store compliance certificates.">
      <CertificatesPageClient />
    </AppShell>
  );
}
