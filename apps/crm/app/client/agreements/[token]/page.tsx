import ClientAgreementView from "@/components/client/ClientAgreementView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { token } = await params;
  if (!token) {
    throw new Error("Missing token");
  }
  return <ClientAgreementView token={token} />;
}
