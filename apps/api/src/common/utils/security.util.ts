/**
 * Security utilities for Fitnexa Enterprise CRM
 */

/**
 * Sanitize cell values against CSV / Formula Injection (CWE-1236)
 * When opened in Microsoft Excel or Google Sheets, formulas beginning with
 * =, +, -, @ or containing tab/carriage return control characters can execute arbitrary commands.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value).trim();
  if (str.length === 0) {
    return '';
  }

  // Dangerous leading formula characters
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    return `'${str}`;
  }

  // Escape double quotes inside CSV
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(',');
  const rowLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
