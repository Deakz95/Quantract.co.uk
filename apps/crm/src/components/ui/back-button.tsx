"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
  variant?: "default" | "ghost" | "secondary";
}

/**
 * Consistent Back Button Component
 *
 * Provides a standard "Back" navigation pattern across all pages.
 * Can either use browser history or navigate to a specific route.
 *
 * @example
 * <BackButton /> // Uses browser back
 * <BackButton href="/admin/jobs" label="Back to Jobs" />
 */
export function BackButton({ href, label = "Back", variant = "ghost" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleBack}
      className="mb-4"
      aria-label={label}
    >
      <ChevronLeft className="w-4 h-4 mr-1" />
      {label}
    </Button>
  );
}
