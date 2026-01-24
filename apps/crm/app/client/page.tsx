"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/useToast";

export default function ClientHome() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // ✅ Show welcome toast after successful onboarding
  useEffect(() => {
    if (params.get("welcome") === "1") {
      toast({
        title: "Welcome — profile created",
        variant: "success",
      });
      // Clean up URL
      router.replace("/client");
    }
  }, [params, router, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-slate-700">Choose a section:</div>
          <div className="flex flex-wrap gap-3">
            <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/client/quotes">
              Quotes
            </Link>
            <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/client/invoices">
              Invoices
            </Link>
            <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/client/certificates">
              Certificates
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            What happens next: review your quote, accept it, sign the agreement, then use invoices here to pay or download receipts.
            Secure token links still work if you aren't logged in.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
