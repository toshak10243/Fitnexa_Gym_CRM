import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { MemberImportService } from './member-import.service';
import { CommitImportDto } from './dto/commit-import.dto';

@ApiTags('Member Imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class MemberImportController {
  constructor(private readonly importService: MemberImportService) {}

  @Post('upload')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Upload Excel or CSV file for dry-run parsing and validation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        branchId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  )
  async uploadFile(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('branchId') queryBranchId: string,
    @Body('branchId') bodyBranchId: string,
  ) {
    const branchId = bodyBranchId || queryBranchId;
    if (!branchId) {
      throw new BadRequestException('Branch ID is required for member migration');
    }
    return this.importService.processDryRun(tenantId, branchId, userId, file);
  }

  @Post('commit')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Commit verified valid import rows into the member directory' })
  async commitBatch(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CommitImportDto,
  ) {
    return this.importService.commitBatch(tenantId, dto.batchId, userId);
  }

  @Get('batches')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'List recent migration batches' })
  async listBatches(@CurrentUser('tenantId') tenantId: string) {
    return this.importService.listBatches(tenantId);
  }

  @Get(':batchId/errors')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Download CSV error report for invalid import rows' })
  async getErrorReport(
    @CurrentUser('tenantId') tenantId: string,
    @Param('batchId') batchId: string,
    @Res() res: Response,
  ) {
    const csvContent = await this.importService.exportErrorReport(tenantId, batchId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="import-errors-${batchId}.csv"`,
    );
    res.status(HttpStatus.OK).send(csvContent);
  }
}
