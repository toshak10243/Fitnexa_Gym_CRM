import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import {
  OpenRegisterSessionDto,
  CloseRegisterSessionDto,
} from '../dto/create-renewal.dto';
import { RegisterSessionStatus } from '@prisma/client';

@Injectable()
export class CashRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Opens a new cash drawer session for front-desk shifts
   */
  async openSession(tenantId: string, currentUserId: string, dto: OpenRegisterSessionDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const existingOpenSession = await this.prisma.cashRegisterSession.findFirst({
      where: {
        tenantId,
        branchId: dto.branchId,
        status: RegisterSessionStatus.OPEN,
      },
    });

    if (existingOpenSession) {
      throw new ConflictException(
        'An active open cash register session already exists for this branch. Close the active session first before opening a new shift.',
      );
    }

    const session = await this.prisma.cashRegisterSession.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        openedBy: currentUserId,
        openingFloatInPaise: dto.openingFloatInPaise,
        expectedClosingPaise: dto.openingFloatInPaise,
        cashCollectedInPaise: 0,
        cashRefundedInPaise: 0,
        status: RegisterSessionStatus.OPEN,
        notes: dto.notes?.trim() || null,
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'CASH_REGISTER_SESSION_OPENED',
      resource: 'CashRegisterSession',
      resourceId: session.id,
      details: {
        branchId: dto.branchId,
        openingFloatInPaise: dto.openingFloatInPaise,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return session;
  }

  /**
   * Returns active open cash session for branch with real-time balance
   */
  async getCurrentSession(tenantId: string, branchId: string) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: {
        tenantId,
        branchId,
        status: RegisterSessionStatus.OPEN,
      },
      include: {
        branch: { select: { name: true } },
      },
    });

    return session;
  }

  /**
   * Closes session with counted cash reconciliation and variance calculation
   */
  async closeSession(
    tenantId: string,
    sessionId: string,
    currentUserId: string,
    dto: CloseRegisterSessionDto,
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) throw new NotFoundException('Cash register session not found');

    if (session.status !== RegisterSessionStatus.OPEN) {
      throw new BadRequestException('Session is already closed');
    }

    const varianceInPaise = dto.actualClosingPaise - session.expectedClosingPaise;

    const closed = await this.prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        actualClosingPaise: dto.actualClosingPaise,
        varianceInPaise,
        status: RegisterSessionStatus.CLOSED,
        closedBy: currentUserId,
        closedAt: new Date(),
        notes: dto.notes ? `${session.notes || ''}\nClosing Note: ${dto.notes}` : session.notes,
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'CASH_REGISTER_SESSION_CLOSED',
      resource: 'CashRegisterSession',
      resourceId: sessionId,
      details: {
        expectedClosingPaise: session.expectedClosingPaise,
        actualClosingPaise: dto.actualClosingPaise,
        varianceInPaise,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return closed;
  }

  /**
   * List recent register sessions
   */
  async listSessions(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    return this.prisma.cashRegisterSession.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: {
        branch: { select: { name: true } },
      },
    });
  }
}
