import ClientQuoteCertificateClient from "./ClientQuoteCertificateClient";

type Props = {
  params: Promise<{ quoteId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { quoteId } = await params;
  if (!quoteId) {
    throw new Error("Missing quoteId");
  }

  return <ClientQuoteCertificateClient quoteId={quoteId} />;
}
