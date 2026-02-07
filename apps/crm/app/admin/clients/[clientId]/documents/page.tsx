import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { ArrowLeft, FileText } from "lucide-react";

type Props = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientDocumentsPage({ params }: Props) {
  const { clientId } = await params;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/admin" },
    { label: "Clients", href: "/admin/clients" },
    { label: "Client", href: `/admin/clients/${clientId}` },
    { label: "Documents" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <Link href={`/admin/clients/${clientId}`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Client
        </Button>
      </Link>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Coming Soon</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-md">
            Client documents is currently under development. You&apos;ll soon be able to
            upload, view, and manage documents associated with this client.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
