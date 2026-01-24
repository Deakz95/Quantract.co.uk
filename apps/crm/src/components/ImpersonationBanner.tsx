"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { apiRequest } from "@/lib/apiClient";
import { useToast } from "@/components/ui/useToast";

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState<{
    adminEmail: string;
    targetRole: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if currently impersonating
    fetch("/api/admin/impersonate/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.impersonating) {
          setImpersonating({
            adminEmail: data.adminEmail,
            targetRole: data.targetRole,
          });
        }
      })
      .catch(() => {});
  }, []);

  const stopImpersonating = async () => {
    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/impersonate`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(res.error || "Failed to stop impersonation");

      toast({
        title: "Stopped impersonating",
        description: "Returning to admin portal",
        variant: "success",
      });

      window.location.href = "/admin";
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to stop impersonation",
        variant: "destructive",
      });
    }
  };

  if (!impersonating) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span className="font-semibold">
          Impersonating {impersonating.targetRole} as admin ({impersonating.adminEmail})
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonating}
        className="text-amber-950 hover:bg-amber-600 hover:text-white"
      >
        <X className="w-4 h-4 mr-1" />
        Stop Impersonating
      </Button>
    </div>
  );
}
