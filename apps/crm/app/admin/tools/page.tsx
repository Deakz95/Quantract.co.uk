"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { ToolCard } from "@/components/tools/ToolCard";
import { Input } from "@/components/ui/Input";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory, type ToolSlug } from "@/lib/tools/types";

const CATEGORY_ORDER: ToolCategory[] = ["core", "residential", "industrial", "lighting", "rams", "reference"];

const RECENT_KEY = "qt_recent_tools";
const MAX_RECENT = 5;

function getRecentSlugs(): ToolSlug[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ToolsHubPage() {
  const [search, setSearch] = useState("");
  const [recentSlugs, setRecentSlugs] = useState<ToolSlug[]>([]);

  useEffect(() => {
    setRecentSlugs(getRecentSlugs());
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return TOOLS;
    const q = search.toLowerCase();
    return TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q) ||
        t.standards.some((s) => s.toLowerCase().includes(q))
    );
  }, [search]);

  const recentTools = useMemo(() => {
    return recentSlugs
      .map((slug) => TOOLS.find((t) => t.slug === slug))
      .filter(Boolean) as typeof TOOLS;
  }, [recentSlugs]);

  const grouped = useMemo(() => {
    const map = new Map<ToolCategory, typeof TOOLS>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const tool of filtered) {
      map.get(tool.category)?.push(tool);
    }
    return map;
  }, [filtered]);

  // Business helpers: links to existing features
  const businessLinks = [
    { slug: "certificates" as ToolSlug, name: "Digital Certificates", shortDescription: "BS 7671 EIC, EICR, MWC generation", category: "reference" as ToolCategory, standards: ["BS 7671" as const], icon: "BadgeCheck", externalHref: "/admin/certificates" },
    { slug: "invoices" as ToolSlug, name: "Invoices", shortDescription: "Create and manage invoices", category: "reference" as ToolCategory, standards: [], icon: "Receipt", externalHref: "/admin/invoices" },
    { slug: "quotes" as ToolSlug, name: "Project Estimator & Quotes", shortDescription: "Build quotes with cost breakdowns", category: "reference" as ToolCategory, standards: [], icon: "FileText", externalHref: "/admin/quotes" },
  ];

  return (
    <AppShell role="admin" title="Tools" subtitle="Electrical calculators, design tools, and safety documents">
      {/* Search */}
      <div className="mb-8">
        <Input
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Recently Used */}
      {!search && recentTools.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">
            Recently Used
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recentTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const tools = grouped.get(cat) ?? [];
        const extras = cat === "reference" ? businessLinks : [];
        const allTools = [...tools, ...extras];
        if (allTools.length === 0 && search) return null;

        const catDef = TOOL_CATEGORIES[cat];
        return (
          <section key={cat} className="mb-10">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[var(--foreground)]">{catDef.label}</h2>
              <p className="text-sm text-[var(--muted-foreground)]">{catDef.description}</p>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {allTools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
