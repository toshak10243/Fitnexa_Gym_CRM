import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogResponse, PaginatedResult } from '@fitnexa/shared';

export interface RecordAuditOptions {
  tenantId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes sensitive fields from details before storing
   */
  private sanitizeDetails(details?: Record<string, any> | null): Record<string, any> | null {
    if (!details) return null;
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  async record(options: RecordAuditOptions): Promise<void> {
    try {
      const sanitizedDetails = this.sanitizeDetails(options.details);
      await this.prisma.auditLog.create({
        data: {
          tenantId: options.tenantId,
          userId: options.userId || null,
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceId || null,
          details: sanitizedDetails || undefined,
          ipAddress: options.ipAddress || 'unknown',
          userAgent: options.userAgent ? options.userAgent.substring(0, 255) : 'unknown',
        },
      });
    } catch (error) {
      // Audit log failures should not crash user-facing transactions
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async findByTenant(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    action?: string,
    resource?: string,
  ): Promise<PaginatedResult<AuditLogResponse>> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = { contains: resource, mode: 'insensitive' };

    const [total, records] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    const items: AuditLogResponse[] = records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      userId: r.userId,
      userEmail: r.user?.email || null,
      userName: r.user?.fullName || null,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      details: r.details as Record<string, unknown> | null,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
