import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateLeadDto,
  UpdateLeadStageDto,
  ScheduleFollowUpDto,
  CompleteFollowUpDto,
  ConvertLeadDto,
} from '../dto/lead.dto';
import { LeadStage, MemberStatus } from '@fitnexa/shared';
import { MembershipStatus } from '@prisma/client';
import { calculateMembershipEndDate } from '../../../common/utils/date.util';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Leads Management
  // --------------------------------------------------------------------------

  async getLeads(
    tenantId: string,
    params: {
      stage?: LeadStage;
      source?: string;
      search?: string;
      branchId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (params.stage) where.stage = params.stage;
    if (params.source) where.source = params.source;
    if (params.branchId) where.branchId = params.branchId;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          followUps: {
            where: { isCompleted: false },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
          convertedMember: {
            select: { id: true, memberCode: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getLeadById(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        followUps: { orderBy: { scheduledAt: 'desc' } },
        activities: { orderBy: { timestamp: 'desc' } },
        convertedMember: true,
      },
    });

    if (!lead) throw new NotFoundException('Lead inquiry not found');
    return lead;
  }

  async createLead(tenantId: string, userId: string, dto: CreateLeadDto) {
    const phone = dto.phone.trim();

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('Select a valid gym branch for this inquiry.');
    }

    // 1. Check if phone is already a registered active member
    const existingMember = await this.prisma.member.findFirst({
      where: { tenantId, phone },
    });
    if (existingMember) {
      throw new ConflictException(
        `Athlete with mobile number ${phone} is already an enrolled gym member (${existingMember.fullName} - ${existingMember.memberCode}).`,
      );
    }

    // 2. Check if active lead already exists with this phone
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        phone,
        stage: { notIn: [LeadStage.CONVERTED, LeadStage.LOST] },
      },
    });
    if (existingLead) {
      throw new ConflictException(
        `An active inquiry already exists for ${dto.firstName} ${dto.lastName} (${phone}) under stage '${existingLead.stage}'.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone,
          email: dto.email?.trim() || null,
          fitnessGoal: dto.fitnessGoal?.trim() || null,
          source: dto.source || 'WALK_IN',
          stage: LeadStage.NEW,
          assignedStaffId: dto.assignedStaffId || userId,
          trialScheduledAt: dto.trialScheduledAt ? new Date(dto.trialScheduledAt) : null,
          notes: dto.notes?.trim() || null,
        },
      });

      // Log initial activity
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          staffId: userId,
          action: 'INQUIRY_CREATED',
          details: {
            source: lead.source,
            fitnessGoal: lead.fitnessGoal,
          },
        },
      });

      return lead;
    });
  }

  async updateStage(
    tenantId: string,
    leadId: string,
    userId: string,
    dto: UpdateLeadStageDto,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    if (lead.stage === LeadStage.CONVERTED) {
      throw new BadRequestException('Converted lead stage cannot be modified.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: dto.stage,
          lostReason: dto.stage === LeadStage.LOST ? dto.lostReason : null,
          lostNotes: dto.stage === LeadStage.LOST ? dto.lostNotes?.trim() : null,
          notes: dto.notes ? `${lead.notes || ''}\n${dto.notes.trim()}`.trim() : lead.notes,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          staffId: userId,
          action: 'STAGE_UPDATED',
          details: {
            previousStage: lead.stage,
            newStage: dto.stage,
            lostReason: dto.lostReason,
            notes: dto.notes,
          },
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // Follow-ups
  // --------------------------------------------------------------------------

  async scheduleFollowUp(
    tenantId: string,
    leadId: string,
    userId: string,
    dto: ScheduleFollowUpDto,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.$transaction(async (tx) => {
      const followUp = await tx.leadFollowUp.create({
        data: {
          leadId,
          staffId: userId,
          scheduledAt: new Date(dto.scheduledAt),
          callType: dto.callType || 'PHONE',
          notes: dto.notes?.trim(),
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          staffId: userId,
          action: 'FOLLOW_UP_SCHEDULED',
          details: {
            scheduledAt: dto.scheduledAt,
            callType: dto.callType,
          },
        },
      });

      return followUp;
    });
  }

  async completeFollowUp(
    tenantId: string,
    followUpId: string,
    userId: string,
    dto: CompleteFollowUpDto,
  ) {
    const followUp = await this.prisma.leadFollowUp.findUnique({
      where: { id: followUpId },
      include: { lead: true },
    });
    if (!followUp || followUp.lead.tenantId !== tenantId) {
      throw new NotFoundException('Follow-up not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leadFollowUp.update({
        where: { id: followUpId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          outcome: dto.outcome.trim(),
          notes: dto.notes ? `${followUp.notes || ''}\n${dto.notes.trim()}`.trim() : followUp.notes,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: followUp.leadId,
          staffId: userId,
          action: 'FOLLOW_UP_COMPLETED',
          details: {
            outcome: dto.outcome,
            notes: dto.notes,
          },
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // One-Click Atomic Lead to Member Conversion
  // --------------------------------------------------------------------------

  async convertLeadToMember(
    tenantId: string,
    leadId: string,
    userId: string,
    dto: ConvertLeadDto,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    if (lead.stage === LeadStage.CONVERTED || lead.convertedMemberId) {
      throw new ConflictException('This lead has already been converted into a gym member.');
    }

    // Verify phone not already registered as a member
    const existingMember = await this.prisma.member.findFirst({
      where: { tenantId, phone: lead.phone },
    });
    if (existingMember) {
      throw new ConflictException(
        `Member with phone ${lead.phone} already exists in organization (${existingMember.memberCode}).`,
      );
    }

    // Generate unique member code: MEM-<random4>
    const memberCode = `MEM-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const fullName = `${lead.firstName} ${lead.lastName}`.trim();

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Member profile
      const member = await tx.member.create({
        data: {
          tenantId,
          branchId: lead.branchId,
          memberCode,
          fullName,
          phone: lead.phone,
          email: lead.email,
          gender: lead.gender,
          fitnessGoal: lead.fitnessGoal,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          status: MemberStatus.ACTIVE,
          createdBy: userId,
        },
      });

      if (dto.planId) {
        const plan = await tx.membershipPlan.findFirst({
          where: { id: dto.planId, tenantId, isActive: true },
        });
        if (!plan) throw new BadRequestException('Selected membership plan not found or inactive.');

        const startDate = dto.joiningDate ? new Date(dto.joiningDate) : new Date();
        const endDate = calculateMembershipEndDate(startDate, plan.durationType, plan.durationValue);
        const taxPaidInPaise = plan.isTaxInclusive
          ? Math.round((plan.priceInPaise * plan.taxRateBps) / (10000 + plan.taxRateBps))
          : Math.round((plan.priceInPaise * plan.taxRateBps) / 10000);

        const membership = await tx.memberMembership.create({
          data: {
            tenantId,
            memberId: member.id,
            planId: plan.id,
            branchId: lead.branchId,
            startDate,
            endDate,
            pricePaidInPaise: plan.priceInPaise,
            taxPaidInPaise,
            status: MembershipStatus.ACTIVE,
            assignedBy: userId,
          },
        });
        await tx.membershipStatusHistory.create({
          data: {
            memberMembershipId: membership.id,
            fromStatus: MembershipStatus.PENDING,
            toStatus: MembershipStatus.ACTIVE,
            reason: 'Initial Plan Enrollment from CRM Lead',
            changedBy: userId,
          },
        });
        await tx.memberActivity.create({
          data: {
            tenantId,
            memberId: member.id,
            performedBy: userId,
            action: 'MEMBERSHIP_ENROLLED',
            details: { planName: plan.name, pricePaidInPaise: plan.priceInPaise },
          },
        });
      }

      // 2. Add residential address if provided
      if (dto.addressLine1) {
        await tx.memberAddress.create({
          data: {
            memberId: member.id,
            addressLine1: dto.addressLine1.trim(),
            city: dto.city?.trim() || 'Mumbai',
            state: dto.state?.trim() || 'Maharashtra',
            pincode: dto.pincode?.trim() || '400001',
            country: 'India',
          },
        });
      }

      // 3. Update Lead to CONVERTED and link convertedMemberId
      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: LeadStage.CONVERTED,
          convertedMemberId: member.id,
        },
      });

      // 4. Record Activity on Lead
      await tx.leadActivity.create({
        data: {
          leadId,
          staffId: userId,
          action: 'LEAD_CONVERTED_TO_MEMBER',
          details: {
            memberId: member.id,
            memberCode: member.memberCode,
            fullName: member.fullName,
          },
        },
      });

      // 5. Record Activity on Member
      await tx.memberActivity.create({
        data: {
          tenantId,
          memberId: member.id,
          performedBy: userId,
          action: 'MEMBER_REGISTERED_FROM_CRM_LEAD',
          details: {
            sourceLeadId: lead.id,
            inquirySource: lead.source,
          },
        },
      });

      return {
        success: true,
        leadId,
        memberId: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        message: 'Lead inquiry successfully converted to gym member.',
      };
    });
  }
}
