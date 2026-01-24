import ClientVariationView from "@/components/client/ClientVariationView";

type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { token } = await params;
  if (!token) {
    throw new Error("Missing token");
  }
  return <ClientVariationView token={token} />;
}
