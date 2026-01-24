"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/useToast";

export default function EngineerHome() {
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
      router.replace("/engineer");
    }
  }, [params, router, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-slate-700">Assigned jobs will appear here.</div>
      </CardContent>
    </Card>
  );
}
