import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class ExportSanitizerService {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Sanitizes a cell string against CSV Formula Injection (DDE injection).
   * If the string starts with '=', '+', '-', '@', '\t', '\r', prefix with a single quote.
   */
  sanitizeCell(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // CSV Formula Injection mitigation
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
    let safeStr = str;
    if (dangerousPrefixes.some((p) => safeStr.startsWith(p))) {
      safeStr = `'${safeStr}`;
    }

    // Escape double quotes inside string
    const escaped = safeStr.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /**
   * Generates a sanitized CSV string from records and logs the export action
   */
  async exportToCsv(
    tenantId: string,
    userId: string,
    reportType: string,
    records: Record<string, any>[],
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    if (records.length === 0) {
      return '';
    }

    const headers = Object.keys(records[0]);
    const headerRow = headers.map((h) => this.sanitizeCell(h)).join(',');

    const rows = records.map((record) =>
      headers.map((h) => this.sanitizeCell(record[h])).join(','),
    );

    const csvContent = [headerRow, ...rows].join('\r\n');

    // Immutable audit record
    await this.auditLogService.record({
      tenantId,
      userId,
      action: 'DATA_EXPORT',
      resource: 'REPORT',
      resourceId: reportType,
      details: {
        reportType,
        recordCount: records.length,
        format: 'CSV',
      },
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'Internal Client',
    });

    return csvContent;
  }
}
