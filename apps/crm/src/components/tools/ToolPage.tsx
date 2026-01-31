"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOOLS, type ToolSlug } from "@/lib/tools/types";

const RECENT_KEY = "qt_recent_tools";
const MAX_RECENT = 5;

function trackRecent(slug: ToolSlug) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const filtered = arr.filter((s) => s !== slug);
    filtered.unshift(slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

interface ToolPageProps {
  slug: ToolSlug;
  children: ReactNode;
}

export function ToolPage({ slug, children }: ToolPageProps) {
  const tool = TOOLS.find((t) => t.slug === slug);

  useEffect(() => {
    trackRecent(slug);
  }, [slug]);

  if (!tool) {
    return (
      <AppShell role="admin" title="Tool Not Found">
        <p className="text-[var(--muted-foreground)]">This tool does not exist.</p>
      </AppShell>
    );
  }

  return (
    <AppShell role="admin" title={tool.name} subtitle={tool.shortDescription}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/tools">
          <Button variant="ghost" size="sm">
            &larr; All Tools
          </Button>
        </Link>
        {tool.standards.map((s) => (
          <Badge key={s} variant="secondary">{s}</Badge>
        ))}
        {tool.estimatorMode && (
          <Badge variant="warning">Estimator Mode</Badge>
        )}
      </div>
      {children}
    </AppShell>
  );
}
