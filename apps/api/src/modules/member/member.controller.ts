import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, MemberStatus } from '@fitnexa/shared';
import { MemberService } from './member.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { CreateMemberNoteDto } from './dto/member-note.dto';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('upload-photo')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Upload member profile photo (JPG, PNG, WebP up to 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'members');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = `member-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          cb(null, cleanName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/i)) {
          return cb(
            new BadRequestException('Only JPG, JPEG, PNG, and WebP images are permitted.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file uploaded.');
    }
    const photoUrl = `/uploads/members/${file.filename}`;
    return {
      status: 'success',
      data: {
        photoUrl,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }

  @Post()
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Register a new member with complete admission record' })
  @ApiResponse({ status: 201, description: 'Member successfully registered' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.memberService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'List members with pagination, search and filters' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: MemberQueryDto,
  ) {
    return this.memberService.findAll(tenantId, query);
  }

  @Get('export')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Export members to sanitized CSV format (CWE-1236 immune)' })
  async exportCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: MemberQueryDto,
    @Res() res: Response,
  ) {
    const csvContent = await this.memberService.exportCsv(tenantId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fitnexa-members-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.status(HttpStatus.OK).send(csvContent);
  }

  @Get(':id')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Get 360 member profile with history and notes' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.memberService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Update member profile details' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.memberService.update(tenantId, id, userId, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Change member lifecycle status (Active/Inactive/Archived)' })
  async updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body('status') status: MemberStatus,
  ) {
    return this.memberService.updateStatus(tenantId, id, userId, status);
  }

  @Delete(':id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Permanently delete a member and related records' })
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.memberService.removePermanently(tenantId, id, userId);
  }

  @Post(':id/notes')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
  )
  @ApiOperation({ summary: 'Add an internal staff note to member profile' })
  async addNote(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateMemberNoteDto,
  ) {
    return this.memberService.addNote(tenantId, id, userId, dto);
  }

  @Get(':id/admission-form')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Get formatted printable admission data for A4 generation' })
  async getAdmissionForm(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.memberService.findById(tenantId, id);
  }
}
