import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { EnquiryListClient } from "./EnquiryListClient";

export const metadata: Metadata = {
  title: "Enquiries | Quantract",
};

export default function EnquiriesPage() {
  return (
    <AppShell role="admin" title="Enquiries" subtitle="Manage leads and track them through your pipeline">
      <EnquiryListClient />
    </AppShell>
  );
}
