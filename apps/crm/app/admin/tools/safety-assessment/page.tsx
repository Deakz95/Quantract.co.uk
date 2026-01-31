"use client";

import { ToolPage } from "@/components/tools/ToolPage";
import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <ToolPage slug="safety-assessment">
      <Card>
        <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
          <p className="text-lg font-semibold mb-2">Coming Soon</p>
          <p className="text-sm">This tool is under development.</p>
        </CardContent>
      </Card>
    </ToolPage>
  );
}
