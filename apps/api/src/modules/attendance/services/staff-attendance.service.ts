import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { StaffCheckInDto, StaffCheckOutDto } from '../dto/staff-attendance.dto';
import { SessionStatus, AttendanceSourceType } from '@fitnexa/shared';

@Injectable()
export class StaffAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(tenantId: string, dto: StaffCheckInDto) {
    const now = new Date();
    const todayDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Check if staff already has an active duty shift
    const existing = await this.prisma.staffAttendance.findFirst({
      where: {
        tenantId,
        staffId: dto.staffId,
        status: SessionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Staff member is already clocked in at ${existing.checkInTime.toLocaleTimeString('en-IN')}.`,
      );
    }

    return this.prisma.staffAttendance.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        staffId: dto.staffId,
        checkInTime: now,
        shiftDate: todayDateOnly,
        source: dto.source || AttendanceSourceType.MANUAL_FRONT_DESK,
        status: SessionStatus.ACTIVE,
        notes: dto.notes,
      },
      include: {
        staff: { select: { id: true, fullName: true, role: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async checkOut(tenantId: string, dto: StaffCheckOutDto) {
    const now = new Date();

    const activeShift = await this.prisma.staffAttendance.findFirst({
      where: {
        tenantId,
        staffId: dto.staffId,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!activeShift) {
      throw new NotFoundException('No active duty shift found for staff member.');
    }

    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - activeShift.checkInTime.getTime()) / 60000),
    );

    return this.prisma.staffAttendance.update({
      where: { id: activeShift.id },
      data: {
        checkOutTime: now,
        durationInMinutes: durationMinutes,
        status: SessionStatus.COMPLETED,
      },
      include: {
        staff: { select: { id: true, fullName: true, role: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async getStaffAttendance(tenantId: string, branchId?: string, dateStr?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (dateStr) where.shiftDate = new Date(dateStr);

    return this.prisma.staffAttendance.findMany({
      where,
      orderBy: { checkInTime: 'desc' },
      include: {
        staff: { select: { id: true, fullName: true, role: true, email: true, phone: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }
}
