"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart, Clock, Receipt } from "lucide-react";

export default function OfficeExportsPage() {
  return (
    <AppShell role="office" title="Exports" subtitle="Download payroll and expenses data">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Payroll Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Payroll Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Download approved timesheets as CSV for payroll processing. Includes engineer hours, rates, and totals.
              </p>
              <a href="/api/admin/office/payroll-export" download>
                <Button variant="default" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Payroll CSV
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Expenses Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                Expenses Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Download approved expenses as CSV for accounting. Includes categories, amounts, and VAT breakdown.
              </p>
              <a href="/api/admin/office/expenses-export" download>
                <Button variant="default" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Expenses CSV
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <FileBarChart className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">Export Notes</div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--muted-foreground)] list-disc list-inside">
                  <li>Payroll CSV includes only approved timesheets</li>
                  <li>Expenses CSV includes only approved expenses with categories</li>
                  <li>All amounts are in GBP</li>
                  <li>CSV headers are stable and compatible with common accounting software</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
