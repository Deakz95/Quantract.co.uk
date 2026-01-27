'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  X,
  Building2,
  Users,
  FileText,
  Briefcase,
  Receipt,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = 'quantract-onboarding-dismissed';
const COMPLETED_STEPS_KEY = 'quantract-onboarding-completed';

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'company-profile',
    title: 'Set up company profile',
    description: 'Add your company details, logo, and contact information',
    href: '/admin/settings',
    icon: Building2,
  },
  {
    id: 'first-client',
    title: 'Add your first client',
    description: 'Create a client record to start managing your relationships',
    href: '/admin/clients',
    icon: Users,
  },
  {
    id: 'create-quote',
    title: 'Create a quote',
    description: 'Build and send a professional quote to your client',
    href: '/admin/quotes',
    icon: FileText,
  },
  {
    id: 'start-job',
    title: 'Start a job',
    description: 'Track work progress and manage job details',
    href: '/admin/jobs',
    icon: Briefcase,
  },
  {
    id: 'send-invoice',
    title: 'Send an invoice',
    description: 'Create and send invoices to get paid faster',
    href: '/admin/invoices',
    icon: Receipt,
  },
];

export function OnboardingChecklist() {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const completed = localStorage.getItem(COMPLETED_STEPS_KEY);

    setIsDismissed(dismissed === 'true');
    if (completed) {
      try {
        setCompletedSteps(JSON.parse(completed));
      } catch {
        // Ignore parsing errors
      }
    }
    setIsLoaded(true);
  }, []);

  // Save completed steps to localStorage
  const toggleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const newCompleted = prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId];
      localStorage.setItem(COMPLETED_STEPS_KEY, JSON.stringify(newCompleted));
      return newCompleted;
    });
  };

  // Dismiss the checklist
  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // Don't render until loaded or if dismissed
  if (!isLoaded || isDismissed) {
    return null;
  }

  const completedCount = completedSteps.length;
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = (completedCount / totalSteps) * 100;
  const allComplete = completedCount === totalSteps;

  return (
    <Card className="relative overflow-hidden border-[var(--primary)]/20 bg-gradient-to-br from-[var(--card)] to-[var(--primary)]/5">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--primary)]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Getting Started
                {allComplete && (
                  <Badge variant="success" className="text-xs">
                    Complete!
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Complete these steps to get the most out of Quantract
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              {completedCount} of {totalSteps} steps complete
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "group flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                  "hover:bg-[var(--muted)]/50",
                  isCompleted && "opacity-60"
                )}
              >
                {/* Checkbox button */}
                <button
                  onClick={() => toggleStepComplete(step.id)}
                  className={cn(
                    "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                    isCompleted
                      ? "text-[var(--success)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                  )}
                  title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-current" />
                  )}
                </button>

                {/* Step icon */}
                <div
                  className={cn(
                    "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isCompleted
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]"
                  )}
                >
                  <StepIcon className="w-5 h-5" />
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCompleted
                        ? "text-[var(--muted-foreground)] line-through"
                        : "text-[var(--foreground)]"
                    )}
                  >
                    {step.title}
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {step.description}
                  </p>
                </div>

                {/* Link arrow */}
                <Link
                  href={step.href}
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                    "text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10",
                    "opacity-0 group-hover:opacity-100"
                  )}
                  title={`Go to ${step.title}`}
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* All complete message */}
        {allComplete && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20">
            <p className="text-sm text-[var(--success)] font-medium text-center">
              Congratulations! You have completed all onboarding steps.
            </p>
            <div className="flex justify-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-[var(--success)] hover:bg-[var(--success)]/10"
              >
                Dismiss checklist
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
