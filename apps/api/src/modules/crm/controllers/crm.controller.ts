import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CrmService } from '../services/crm.service';
import {
  CreateLeadDto,
  UpdateLeadStageDto,
  ScheduleFollowUpDto,
  CompleteFollowUpDto,
  ConvertLeadDto,
} from '../dto/lead.dto';
import { LeadStage } from '@fitnexa/shared';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  async getLeads(
    @CurrentUser() user: any,
    @Query('stage') stage?: LeadStage,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.getLeads(user.tenantId, {
      stage,
      source,
      search,
      branchId: branchId || user.branchId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post()
  async createLead(
    @CurrentUser() user: any,
    @Body() dto: CreateLeadDto,
  ) {
    return this.crmService.createLead(user.tenantId, user.userId, dto);
  }

  @Get(':id')
  async getLeadById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.crmService.getLeadById(user.tenantId, id);
  }

  @Patch(':id/stage')
  async updateStage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.crmService.updateStage(user.tenantId, id, user.userId, dto);
  }

  @Post(':id/follow-ups')
  async scheduleFollowUp(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ScheduleFollowUpDto,
  ) {
    return this.crmService.scheduleFollowUp(user.tenantId, id, user.userId, dto);
  }

  @Patch('follow-ups/:followUpId/complete')
  async completeFollowUp(
    @CurrentUser() user: any,
    @Param('followUpId') followUpId: string,
    @Body() dto: CompleteFollowUpDto,
  ) {
    return this.crmService.completeFollowUp(user.tenantId, followUpId, user.userId, dto);
  }

  @Post(':id/convert')
  async convertLead(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.crmService.convertLeadToMember(user.tenantId, id, user.userId, dto);
  }
}
