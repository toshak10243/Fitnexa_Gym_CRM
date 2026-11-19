import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { CreateMemberNoteDto } from './dto/member-note.dto';
import { MemberStatus, Prisma } from '@prisma/client';
import { generateCsvString } from '../../common/utils/security.util';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Generates a tenant-unique sequential member code (e.g. FX-2026-0001)
   */
  async generateMemberCode(tenantId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `FX-${currentYear}-`;

    const latestMember = await this.prisma.member.findFirst({
      where: {
        tenantId,
        memberCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        memberCode: true,
      },
    });

    let sequence = 1;
    if (latestMember && latestMember.memberCode) {
      const parts = latestMember.memberCode.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }
    }

    const paddedSeq = sequence.toString().padStart(4, '0');
    return `${prefix}${paddedSeq}`;
  }

  /**
   * Atomically registers a new member with address, emergency contact,
   * health declaration, consent records, and initial audit trail
   */
  async create(tenantId: string, currentUserId: string, dto: CreateMemberDto) {
    // 1. Verify branch belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) {
      throw new BadRequestException('Branch not found or does not belong to this organization');
    }

    // 2. Check duplicate phone within this tenant
    const existingPhone = await this.prisma.member.findFirst({
      where: { tenantId, phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException(`A member with phone number "${dto.phone}" already exists.`);
    }

    // 3. Generate sequential member code
    const memberCode = await this.generateMemberCode(tenantId);

    // 4. Atomic transaction
    const createdMember = await this.prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          memberCode,
          fullName: dto.fullName.trim(),
          email: dto.email ? dto.email.trim().toLowerCase() : null,
          phone: dto.phone.trim(),
          altPhone: dto.altPhone ? dto.altPhone.trim() : null,
          photoUrl: dto.photoUrl || null,
          dob: dto.dob ? new Date(dto.dob) : null,
          gender: dto.gender || null,
          occupation: dto.occupation ? dto.occupation.trim() : null,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          fitnessGoal: dto.fitnessGoal || null,
          previousExperience: dto.previousExperience || null,
          heightCm: dto.heightCm || null,
          weightKg: dto.weightKg || null,
          workoutTiming: dto.workoutTiming || null,
          assignedTrainerId: dto.assignedTrainerId || null,
          isMinor: dto.isMinor || false,
          guardianName: dto.guardianName || null,
          guardianPhone: dto.guardianPhone || null,
          guardianRelation: dto.guardianRelation || null,
          createdBy: currentUserId,
          status: MemberStatus.ACTIVE,
        },
      });

      if (dto.address) {
        await tx.memberAddress.create({
          data: {
            memberId: member.id,
            addressLine1: dto.address.addressLine1.trim(),
            addressLine2: dto.address.addressLine2 ? dto.address.addressLine2.trim() : null,
            city: dto.address.city.trim(),
            state: dto.address.state.trim(),
            pincode: dto.address.pincode.trim(),
            country: dto.address.country ? dto.address.country.trim() : 'India',
          },
        });
      }

      if (dto.emergencyContact) {
        await tx.memberEmergencyContact.create({
          data: {
            memberId: member.id,
            name: dto.emergencyContact.name.trim(),
            relationship: dto.emergencyContact.relationship.trim(),
            phone: dto.emergencyContact.phone.trim(),
          },
        });
      }

      if (dto.healthDeclaration) {
        await tx.memberHealthDeclaration.create({
          data: {
            memberId: member.id,
            hasHealthCondition: dto.healthDeclaration.hasHealthCondition,
            medicalHistory: dto.healthDeclaration.medicalHistory || null,
            exerciseRestrictions: dto.healthDeclaration.exerciseRestrictions || null,
            emergencyConsent: dto.healthDeclaration.emergencyConsent ?? true,
            processingConsent: dto.healthDeclaration.processingConsent ?? true,
          },
        });
      }

      if (dto.consent) {
        await tx.memberConsent.create({
          data: {
            memberId: member.id,
            termsAccepted: dto.consent.termsAccepted,
            privacyPolicyAccepted: dto.consent.privacyPolicyAccepted,
            gymRulesAccepted: dto.consent.gymRulesAccepted,
            marketingConsent: dto.consent.marketingConsent || false,
            guardianConsentGiven: dto.consent.guardianConsentGiven || null,
          },
        });
      }

      await tx.memberActivity.create({
        data: {
          memberId: member.id,
          tenantId,
          performedBy: currentUserId,
          action: 'MEMBER_REGISTERED',
          details: {
            memberCode,
            branchName: branch.name,
          },
        },
      });

      return member;
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBER_REGISTERED',
      resource: 'Member',
      resourceId: createdMember.id,
      details: {
        memberCode: createdMember.memberCode,
        fullName: createdMember.fullName,
        branchId: createdMember.branchId,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return this.findById(tenantId, createdMember.id);
  }

  /**
   * Find paginated members with search and filter capabilities
   */
  async findAll(tenantId: string, query: MemberQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = {
      tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.assignedTrainerId) {
      where.assignedTrainerId = query.assignedTrainerId;
    }

    if (query.search && query.search.trim().length > 0) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { memberCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.MemberOrderByWithRelationInput = {};
    if (query.sortBy === 'fullName' || query.sortBy === 'joiningDate' || query.sortBy === 'createdAt') {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, members] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          assignedTrainer: {
            select: { id: true, fullName: true, email: true },
          },
          memberships: {
            take: 1,
            orderBy: { endDate: 'desc' },
            include: {
              plan: {
                select: { name: true, durationType: true, durationValue: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: members,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Complete 360 profile for a single member with tenant validation (IDOR protected)
   */
  async findById(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
      include: {
        branch: {
          select: { id: true, name: true, code: true, city: true },
        },
        assignedTrainer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        address: true,
        emergencyContact: true,
        healthDeclaration: true,
        consent: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        memberships: {
          orderBy: { createdAt: 'desc' },
          include: {
            plan: true,
            statusHistory: {
              orderBy: { changedAt: 'desc' },
            },
          },
        },
        notes: {
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          include: {
            author: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
        activities: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  /**
   * Update member details
   */
  async update(tenantId: string, id: string, currentUserId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (dto.phone && dto.phone !== member.phone) {
      const duplicatePhone = await this.prisma.member.findFirst({
        where: { tenantId, phone: dto.phone, id: { not: id } },
      });
      if (duplicatePhone) {
        throw new ConflictException(`Another member with phone number "${dto.phone}" already exists.`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id },
        data: {
          fullName: dto.fullName?.trim(),
          email: dto.email ? dto.email.trim().toLowerCase() : dto.email === '' ? null : undefined,
          phone: dto.phone?.trim(),
          altPhone: dto.altPhone?.trim(),
          photoUrl: dto.photoUrl,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          gender: dto.gender,
          occupation: dto.occupation?.trim(),
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
          fitnessGoal: dto.fitnessGoal,
          previousExperience: dto.previousExperience,
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          workoutTiming: dto.workoutTiming,
          assignedTrainerId: dto.assignedTrainerId,
          status: dto.status,
          isMinor: dto.isMinor,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          guardianRelation: dto.guardianRelation,
          updatedBy: currentUserId,
        },
      });

      if (dto.address) {
        await tx.memberAddress.upsert({
          where: { memberId: id },
          create: {
            memberId: id,
            addressLine1: dto.address.addressLine1?.trim() || '',
            addressLine2: dto.address.addressLine2?.trim() || null,
            city: dto.address.city?.trim() || '',
            state: dto.address.state?.trim() || '',
            pincode: dto.address.pincode?.trim() || '',
            country: dto.address.country?.trim() || 'India',
          },
          update: {
            addressLine1: dto.address.addressLine1?.trim(),
            addressLine2: dto.address.addressLine2?.trim(),
            city: dto.address.city?.trim(),
            state: dto.address.state?.trim(),
            pincode: dto.address.pincode?.trim(),
            country: dto.address.country?.trim(),
          },
        });
      }

      if (dto.emergencyContact) {
        await tx.memberEmergencyContact.upsert({
          where: { memberId: id },
          create: {
            memberId: id,
            name: dto.emergencyContact.name?.trim() || '',
            relationship: dto.emergencyContact.relationship?.trim() || '',
            phone: dto.emergencyContact.phone?.trim() || '',
          },
          update: {
            name: dto.emergencyContact.name?.trim(),
            relationship: dto.emergencyContact.relationship?.trim(),
            phone: dto.emergencyContact.phone?.trim(),
          },
        });
      }

      if (dto.healthDeclaration) {
        await tx.memberHealthDeclaration.upsert({
          where: { memberId: id },
          create: {
            memberId: id,
            hasHealthCondition: dto.healthDeclaration.hasHealthCondition ?? false,
            medicalHistory: dto.healthDeclaration.medicalHistory || null,
            exerciseRestrictions: dto.healthDeclaration.exerciseRestrictions || null,
            emergencyConsent: dto.healthDeclaration.emergencyConsent ?? true,
            processingConsent: dto.healthDeclaration.processingConsent ?? true,
          },
          update: {
            hasHealthCondition: dto.healthDeclaration.hasHealthCondition,
            medicalHistory: dto.healthDeclaration.medicalHistory,
            exerciseRestrictions: dto.healthDeclaration.exerciseRestrictions,
            emergencyConsent: dto.healthDeclaration.emergencyConsent,
            processingConsent: dto.healthDeclaration.processingConsent,
          },
        });
      }

      await tx.memberActivity.create({
        data: {
          memberId: id,
          tenantId,
          performedBy: currentUserId,
          action: 'MEMBER_UPDATED',
          details: { updatedFields: Object.keys(dto) },
        },
      });
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBER_UPDATED',
      resource: 'Member',
      resourceId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return this.findById(tenantId, id);
  }

  /**
   * Archive or toggle status of a member
   */
  async updateStatus(tenantId: string, id: string, currentUserId: string, status: MemberStatus) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        status,
        updatedBy: currentUserId,
      },
    });

    await this.prisma.memberActivity.create({
      data: {
        memberId: id,
        tenantId,
        performedBy: currentUserId,
        action: 'STATUS_CHANGED',
        details: { from: member.status, to: status },
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBER_STATUS_CHANGED',
      resource: 'Member',
      resourceId: id,
      details: { fromStatus: member.status, toStatus: status },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updated;
  }

  /**
   * Add a staff internal note on member profile
   */
  async addNote(tenantId: string, memberId: string, authorId: string, dto: CreateMemberNoteDto) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const note = await this.prisma.memberNote.create({
      data: {
        memberId,
        tenantId,
        authorId,
        note: dto.note.trim(),
        isPinned: dto.isPinned || false,
      },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return note;
  }

  /**
   * Export member records to CSV with Formula Injection Sanitization (CWE-1236)
   */
  async exportCsv(tenantId: string, query: MemberQueryDto): Promise<string> {
    const where: Prisma.MemberWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;

    if (query.search && query.search.trim().length > 0) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { memberCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const members = await this.prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        branch: { select: { name: true } },
        address: true,
        emergencyContact: true,
        memberships: {
          take: 1,
          orderBy: { endDate: 'desc' },
          include: { plan: { select: { name: true } } },
        },
      },
    });

    const headers = [
      'Member Code',
      'Full Name',
      'Phone Number',
      'Email',
      'Branch',
      'Status',
      'Gender',
      'Joining Date',
      'Current Plan',
      'City',
      'Emergency Contact Name',
      'Emergency Contact Phone',
    ];

    const rows = members.map((m) => [
      m.memberCode,
      m.fullName,
      m.phone,
      m.email || '',
      m.branch.name,
      m.status,
      m.gender || '',
      m.joiningDate.toISOString().split('T')[0],
      m.memberships[0]?.plan.name || 'None',
      m.address?.city || '',
      m.emergencyContact?.name || '',
      m.emergencyContact?.phone || '',
    ]);

    return generateCsvString(headers, rows);
  }
}
