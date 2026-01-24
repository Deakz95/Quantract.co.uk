import AdminVariationClient from "./AdminVariationClient";

type Props = {
  params: Promise<{ variationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { variationId } = await params;
  if (!variationId) {
    throw new Error("Missing variationId");
  }

  return <AdminVariationClient variationId={variationId} />;
}
