"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/useToast";
import dynamic from "next/dynamic";

const JobsMap = dynamic(() => import("@/components/admin/JobsMap"), { ssr: false });

export default function EngineerHome() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (params.get("welcome") === "1") {
      toast({
        title: "Welcome — profile created",
        variant: "success",
      });
      router.replace("/engineer");
    }
  }, [params, router, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">Assigned jobs will appear here.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <JobsMap defaultTodayOnly />
        </CardContent>
      </Card>
    </div>
  );
}
