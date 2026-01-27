"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check } from "lucide-react";

export type ExportButtonProps = {
  onExport: () => void;
  disabled?: boolean;
};

export function ExportButton({ onExport, disabled }: ExportButtonProps) {
  const [exported, setExported] = useState(false);

  const handleClick = () => {
    onExport();
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={disabled || exported}
      className="flex items-center gap-2"
    >
      {exported ? (
        <>
          <Check className="w-4 h-4" />
          Exported
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export CSV
        </>
      )}
    </Button>
  );
}

// Utility function to generate CSV content
export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCSV = (value: string | number): string => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCSV).join(",");
  const dataRows = rows.map((row) => row.map(escapeCSV).join(","));

  return [headerRow, ...dataRows].join("\n");
}

// Utility function to download CSV file
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
