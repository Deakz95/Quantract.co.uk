"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ToolDefinition } from "@/lib/tools/types";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const href = tool.externalHref ?? `/admin/tools/${tool.slug}`;
  const isExternal = !!tool.externalHref;

  return (
    <Link
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <Card variant="interactive" className="h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{tool.name}</CardTitle>
            {tool.estimatorMode && (
              <Badge variant="warning" className="shrink-0 text-[10px]">Estimator</Badge>
            )}
          </div>
          <CardDescription>{tool.shortDescription}</CardDescription>
          {tool.standards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tool.standards.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>
    </Link>
  );
}
