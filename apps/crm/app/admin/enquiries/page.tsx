import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { EnquiryListClient } from "./EnquiryListClient";

export const metadata: Metadata = {
  title: "Enquiries | Quantract",
};

export default function EnquiriesPage() {
  return (
    <AppShell role="admin" title="Enquiries" subtitle="Track incoming leads and new business enquiries through your sales pipeline">
      <EnquiryListClient />
    </AppShell>
  );
}
