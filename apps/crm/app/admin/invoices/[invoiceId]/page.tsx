import InvoiceAdminDetail from "@/components/admin/InvoiceAdminDetail";

type Props = {
  params: Promise<{ invoiceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { invoiceId } = await params;
  if (!invoiceId) {
    throw new Error("Missing invoiceId");
  }
  return <InvoiceAdminDetail invoiceId={invoiceId} />;
}
