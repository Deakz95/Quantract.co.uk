/**
 * CSV Parser Utility
 *
 * Provides CSV parsing with support for quoted fields.
 */

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/**
 * Parse CSV content into headers and rows.
 * Handles quoted fields, escaped quotes, and various line endings.
 */
export function parseCSV(content: string): ParsedCSV {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  // Parse line by line, handling quoted fields that may contain newlines
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === "\n" || (char === "\r" && nextChar === "\n")) && !inQuotes) {
      // End of line
      lines.push(current.trim());
      current = "";
      if (char === "\r") i++; // Skip \n in \r\n
    } else if (char === "\r" && !inQuotes) {
      // Standalone \r
      lines.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Don't forget the last line
  if (current.trim()) {
    lines.push(current.trim());
  }

  // Filter empty lines
  const nonEmptyLines = lines.filter((line) => line.length > 0);

  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse each line into fields
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = "";
    let inFieldQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (!inFieldQuotes) {
          inFieldQuotes = true;
        } else if (nextChar === '"') {
          // Escaped quote within quotes
          field += '"';
          i++;
        } else {
          // End of quoted field
          inFieldQuotes = false;
        }
      } else if (char === "," && !inFieldQuotes) {
        fields.push(field.trim());
        field = "";
      } else {
        field += char;
      }
    }

    // Add the last field
    fields.push(field.trim());

    return fields;
  };

  const headers = parseLine(nonEmptyLines[0]);
  const rows = nonEmptyLines.slice(1).map(parseLine);

  return { headers, rows };
}

/**
 * Parse Excel-style file (simplified - assumes CSV export).
 * For real Excel support, use a library like xlsx.
 */
export function parseExcel(buffer: Buffer): ParsedCSV {
  // Try to detect encoding and convert to string
  let content: string;

  // Check for BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    // UTF-8 with BOM
    content = buffer.toString("utf-8").substring(1);
  } else if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    // UTF-16 LE
    content = buffer.toString("utf16le").substring(1);
  } else {
    // Assume UTF-8
    content = buffer.toString("utf-8");
  }

  return parseCSV(content);
}

/**
 * Get preview data (first N rows)
 */
export function getPreviewData(
  parsed: ParsedCSV,
  count: number = 5
): { headers: string[]; previewRows: string[][] } {
  return {
    headers: parsed.headers,
    previewRows: parsed.rows.slice(0, count),
  };
}
