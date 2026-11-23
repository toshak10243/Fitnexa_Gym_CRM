import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateTrainerDto,
  UpsertTrainerProfileDto,
  SetTrainerAvailabilityDto,
  CreateTrainingPackageDto,
  AssignTrainerPackageDto,
  BookTrainingSessionDto,
} from '../dto/trainer.dto';
import { TrainerSessionStatus } from '@fitnexa/shared';

@Injectable()
export class TrainerService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Trainer Profiles
  // --------------------------------------------------------------------------

  async createTrainer(tenantId: string, _createdById: string, dto: CreateTrainerDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const rawPass = dto.password?.trim() || Math.random().toString(36).slice(-10) + 'X!';
    const passwordHash = await bcrypt.hash(rawPass, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          branchId: dto.branchId || null,
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone.trim(),
          fullName: dto.fullName.trim(),
          passwordHash,
          mustChangePassword: true,
          role: 'TRAINER',
          status: 'ACTIVE',
        },
      });

      const trainer = await tx.trainerProfile.create({
        data: {
          userId: user.id,
          tenantId,
          branchId: dto.branchId || null,
          photoUrl: dto.photoUrl || null,
          gender: dto.gender || null,
          dob: dto.dob ? new Date(dto.dob) : null,
          bloodGroup: dto.bloodGroup || null,
          emergencyContactName: dto.emergencyContactName || null,
          emergencyContactPhone: dto.emergencyContactPhone || null,
          address: dto.address || null,
          city: dto.city || null,
          state: dto.state || null,
          pincode: dto.pincode || null,
          dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : new Date(),
          baseSalaryInPaise: dto.baseSalaryInPaise || 0,
          commissionPercentage: dto.commissionPercentage || 0,
          employmentType: dto.employmentType || 'FULL_TIME',
          shift: dto.shift || 'GENERAL',
          specializations: dto.specializations || [],
          certifications: dto.certifications?.trim() || null,
          experienceYears: dto.experienceYears || 0,
          idProofType: dto.idProofType || null,
          idProofNumber: dto.idProofNumber || null,
          bio: dto.bio?.trim() || null,
          documents: dto.documents || [],
          isActive: true,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      });

      return trainer;
    });
  }

  async getTrainers(tenantId: string) {
    return this.prisma.trainerProfile.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
        availabilities: true,
        _count: {
          select: { assignments: true, sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrainerById(tenantId: string, id: string) {
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, status: true, role: true } },
        availabilities: true,
        assignments: {
          include: {
            member: { select: { id: true, fullName: true, phone: true, memberCode: true, photoUrl: true } },
            package: true,
          },
        },
        sessions: {
          take: 20,
          orderBy: { scheduledAt: 'desc' },
          include: {
            member: { select: { id: true, fullName: true } },
            assignment: {
              include: {
                package: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!trainer) throw new NotFoundException('Trainer profile not found');
    return trainer;
  }

  async updateTrainer(tenantId: string, id: string, dto: CreateTrainerDto) {
    const trainer = await this.prisma.trainerProfile.findFirst({ where: { id, tenantId }, select: { id: true, userId: true } });
    if (!trainer) throw new NotFoundException('Trainer profile not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: trainer.userId }, data: {
        fullName: dto.fullName?.trim(), email: dto.email?.toLowerCase().trim(), phone: dto.phone?.trim(), branchId: dto.branchId || null,
      }});
      return tx.trainerProfile.update({ where: { id: trainer.id }, data: {
        branchId: dto.branchId || null, photoUrl: dto.photoUrl, gender: dto.gender, dob: dto.dob ? new Date(dto.dob) : undefined,
        bloodGroup: dto.bloodGroup, emergencyContactName: dto.emergencyContactName, emergencyContactPhone: dto.emergencyContactPhone,
        address: dto.address, city: dto.city, state: dto.state, pincode: dto.pincode, dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        baseSalaryInPaise: dto.baseSalaryInPaise, commissionPercentage: dto.commissionPercentage, employmentType: dto.employmentType, shift: dto.shift,
        specializations: dto.specializations, certifications: dto.certifications, experienceYears: dto.experienceYears, idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber, bio: dto.bio, documents: dto.documents,
      }, include: { user: { select: { id: true, fullName: true, email: true, phone: true, status: true } } } });
    });
  }

  async deleteTrainer(tenantId: string, id: string) {
    const trainer = await this.prisma.trainerProfile.findFirst({ where: { id, tenantId }, select: { id: true, userId: true } });
    if (!trainer) throw new NotFoundException('Trainer profile not found');
    const [assignments, sessions] = await Promise.all([
      this.prisma.trainerAssignment.count({ where: { trainerProfileId: id } }),
      this.prisma.trainingSession.count({ where: { trainerProfileId: id } }),
    ]);
    if (assignments || sessions) throw new BadRequestException('Trainer cannot be deleted because assignments or sessions exist. Suspend the trainer instead.');
    await this.prisma.$transaction([
      this.prisma.trainerProfile.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: trainer.userId } }),
    ]);
    return { status: 'success', message: 'Trainer deleted successfully.' };
  }

  async upsertTrainerProfile(tenantId: string, dto: UpsertTrainerProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });
    if (!user) throw new NotFoundException('User account not found');

    return this.prisma.trainerProfile.upsert({
      where: { userId: dto.userId },
      update: {
        branchId: dto.branchId,
        bio: dto.bio?.trim(),
        specializations: dto.specializations || [],
        certifications: dto.certifications?.trim(),
        commissionPercentage: dto.commissionPercentage || 0,
        photoUrl: dto.photoUrl,
        gender: dto.gender,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        bloodGroup: dto.bloodGroup,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        baseSalaryInPaise: dto.baseSalaryInPaise,
        employmentType: dto.employmentType,
        shift: dto.shift,
        experienceYears: dto.experienceYears,
        idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      create: {
        userId: dto.userId,
        tenantId,
        branchId: dto.branchId,
        bio: dto.bio?.trim(),
        specializations: dto.specializations || [],
        certifications: dto.certifications?.trim(),
        commissionPercentage: dto.commissionPercentage || 0,
        photoUrl: dto.photoUrl,
        gender: dto.gender,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        bloodGroup: dto.bloodGroup,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : new Date(),
        baseSalaryInPaise: dto.baseSalaryInPaise || 0,
        employmentType: dto.employmentType || 'FULL_TIME',
        shift: dto.shift || 'GENERAL',
        experienceYears: dto.experienceYears || 0,
        idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber,
        isActive: true,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });
  }

  async setAvailability(
    tenantId: string,
    trainerProfileId: string,
    dto: SetTrainerAvailabilityDto,
  ) {
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { id: trainerProfileId, tenantId },
    });
    if (!trainer) throw new NotFoundException('Trainer profile not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.trainerAvailability.deleteMany({
        where: { trainerProfileId },
      });

      await tx.trainerAvailability.createMany({
        data: dto.availabilities.map((a) => ({
          trainerProfileId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isAvailable: a.isAvailable !== undefined ? a.isAvailable : true,
        })),
      });

      return tx.trainerAvailability.findMany({
        where: { trainerProfileId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  // --------------------------------------------------------------------------
  // Training Packages
  // --------------------------------------------------------------------------

  async getPackages(tenantId: string) {
    return this.prisma.trainingPackage.findMany({
      where: { tenantId, isActive: true },
      orderBy: { priceInPaise: 'asc' },
    });
  }

  async createPackage(tenantId: string, dto: CreateTrainingPackageDto) {
    return this.prisma.trainingPackage.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        sessionCount: dto.sessionCount,
        validityDays: dto.validityDays,
        priceInPaise: dto.priceInPaise,
        isActive: true,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Client Assignments
  // --------------------------------------------------------------------------

  async assignPackage(tenantId: string, dto: AssignTrainerPackageDto) {
    const pkg = await this.prisma.trainingPackage.findFirst({
      where: { id: dto.packageId, tenantId },
    });
    if (!pkg) throw new NotFoundException('Training package not found');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + pkg.validityDays);

    return this.prisma.trainerAssignment.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        trainerProfileId: dto.trainerProfileId,
        memberId: dto.memberId,
        packageId: dto.packageId,
        totalSessions: pkg.sessionCount,
        remainingSessions: pkg.sessionCount,
        startDate,
        endDate,
        isActive: true,
        notes: dto.notes?.trim(),
      },
      include: {
        trainerProfile: { include: { user: true } },
        member: true,
        package: true,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Session Scheduling & Conflict Detection
  // --------------------------------------------------------------------------

  async getSchedule(tenantId: string, trainerProfileId?: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    if (trainerProfileId) where.trainerProfileId = trainerProfileId;
    if (startDate && endDate) {
      where.scheduledAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.prisma.trainingSession.findMany({
      where,
      include: {
        trainerProfile: { include: { user: true } },
        member: { select: { id: true, fullName: true, phone: true, memberCode: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async bookSession(tenantId: string, dto: BookTrainingSessionDto) {
    const sessionStart = new Date(dto.scheduledAt);
    const duration = dto.durationMinutes || 60;
    const sessionEnd = new Date(sessionStart.getTime() + duration * 60 * 1000);

    // 1. Check for Trainer Scheduling Conflicts
    const trainerConflict = await this.prisma.trainingSession.findFirst({
      where: {
        tenantId,
        trainerProfileId: dto.trainerProfileId,
        status: TrainerSessionStatus.SCHEDULED,
        scheduledAt: {
          lt: sessionEnd,
          gte: new Date(sessionStart.getTime() - 240 * 60 * 1000), // Within overlap window
        },
      },
    });

    if (trainerConflict) {
      const conflictEnd = new Date(
        trainerConflict.scheduledAt.getTime() + trainerConflict.durationMinutes * 60 * 1000,
      );
      if (sessionStart < conflictEnd && sessionEnd > trainerConflict.scheduledAt) {
        throw new ConflictException(
          `Trainer already has a scheduled session at ${trainerConflict.scheduledAt.toLocaleTimeString('en-IN')}. Please select another time slot.`,
        );
      }
    }

    // 2. Check for Member Scheduling Conflicts
    const memberConflict = await this.prisma.trainingSession.findFirst({
      where: {
        tenantId,
        memberId: dto.memberId,
        status: TrainerSessionStatus.SCHEDULED,
        scheduledAt: {
          lt: sessionEnd,
          gte: new Date(sessionStart.getTime() - 240 * 60 * 1000),
        },
      },
    });

    if (memberConflict) {
      const conflictEnd = new Date(
        memberConflict.scheduledAt.getTime() + memberConflict.durationMinutes * 60 * 1000,
      );
      if (sessionStart < conflictEnd && sessionEnd > memberConflict.scheduledAt) {
        throw new ConflictException(
          `Member already has another training session booked at ${memberConflict.scheduledAt.toLocaleTimeString('en-IN')}.`,
        );
      }
    }

    // 3. Verify Assignment remaining sessions if assignmentId provided
    if (dto.assignmentId) {
      const assignment = await this.prisma.trainerAssignment.findFirst({
        where: { id: dto.assignmentId, tenantId },
      });
      if (!assignment || assignment.remainingSessions <= 0) {
        throw new BadRequestException('No remaining sessions left on this training package assignment.');
      }
    }

    return this.prisma.trainingSession.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        trainerProfileId: dto.trainerProfileId,
        memberId: dto.memberId,
        assignmentId: dto.assignmentId,
        scheduledAt: sessionStart,
        durationMinutes: duration,
        status: TrainerSessionStatus.SCHEDULED,
        notes: dto.notes?.trim(),
      },
      include: {
        trainerProfile: { include: { user: true } },
        member: true,
      },
    });
  }

  async completeSession(tenantId: string, sessionId: string, notes?: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trainingSession.update({
        where: { id: sessionId },
        data: {
          status: TrainerSessionStatus.COMPLETED,
          notes: notes ? notes.trim() : session.notes,
        },
      });

      if (session.assignmentId) {
        await tx.trainerAssignment.update({
          where: { id: session.assignmentId },
          data: {
            remainingSessions: { decrement: 1 },
          },
        });
      }

      return updated;
    });
  }

  async cancelSession(tenantId: string, sessionId: string, reason?: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        status: TrainerSessionStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : session.notes,
      },
    });
  }
}
