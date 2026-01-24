import ClientQuoteView from "@/components/client/ClientQuoteView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ quoteId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { quoteId } = await params;
  if (!quoteId) {
    throw new Error("Missing quoteId");
  }
  // In Phase A, quoteId param is used as the share token
  return <ClientQuoteView token={quoteId} />;
}
