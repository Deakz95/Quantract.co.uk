"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/useToast";
import TodayClient from "@/components/engineer/TodayClient";

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

  return <TodayClient />;
}
