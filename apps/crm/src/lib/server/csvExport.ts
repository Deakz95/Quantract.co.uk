/**
 * CSV Export Utility
 *
 * Provides safe CSV generation for reports.
 * Handles escaping, formatting, and prevents injection attacks.
 */

export function generateCSV(data: Record<string, any>[], headers?: string[]): string {
  if (data.length === 0) return "";

  // Use provided headers or extract from first row
  const columnHeaders = headers || Object.keys(data[0]);

  // Escape CSV field
  const escapeField = (value: any): string => {
    if (value === null || value === undefined) return "";

    const str = String(value);

    // Prevent CSV injection
    if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
      return `"'${str.replace(/"/g, '""')}"`;
    }

    // Escape quotes and wrap if contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  // Build CSV
  const lines: string[] = [];

  // Header row
  lines.push(columnHeaders.map(escapeField).join(","));

  // Data rows
  data.forEach((row) => {
    const values = columnHeaders.map((header) => {
      const value = row[header];

      // Format dates
      if (value instanceof Date) {
        return value.toISOString().split("T")[0];
      }

      // Format numbers
      if (typeof value === "number") {
        return value.toFixed(2);
      }

      return value;
    });

    lines.push(values.map(escapeField).join(","));
  });

  return lines.join("\r\n");
}

export function downloadCSV(filename: string, csvContent: string): void {
  // This function would be used client-side
  // For server-side, we return CSV content with appropriate headers
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getCSVHeaders() {
  return {
    "Content-Type": "text/csv",
    "Content-Disposition": `attachment; filename="export-${Date.now()}.csv"`,
  };
}
