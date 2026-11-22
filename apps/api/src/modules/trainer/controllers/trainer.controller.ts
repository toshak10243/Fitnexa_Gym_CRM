import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@fitnexa/shared';
import { TrainerService } from '../services/trainer.service';
import {
  CreateTrainerDto,
  UpsertTrainerProfileDto,
  SetTrainerAvailabilityDto,
  CreateTrainingPackageDto,
  AssignTrainerPackageDto,
  BookTrainingSessionDto,
} from '../dto/trainer.dto';

@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get()
  async getTrainers(@CurrentUser() user: any) {
    return this.trainerService.getTrainers(user.tenantId);
  }

  @Post('upload-photo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'trainers');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = `trainer-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          cb(null, cleanName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
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
  uploadTrainerPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file uploaded.');
    }
    const photoUrl = `/uploads/trainers/${file.filename}`;
    return {
      status: 'success',
      data: {
        photoUrl,
        filename: file.filename,
        size: file.size,
      },
    };
  }

  @Post('upload-document')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'trainer-documents');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          cb(null, cleanName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf)$/i)) {
          return cb(
            new BadRequestException('Only JPG, PNG, WebP images and PDF documents are permitted.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadTrainerDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No document file uploaded.');
    }
    const documentUrl = `/uploads/trainer-documents/${file.filename}`;
    return {
      status: 'success',
      data: {
        documentUrl,
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
      },
    };
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createTrainer(
    @CurrentUser() user: any,
    @Body() dto: CreateTrainerDto,
  ) {
    return this.trainerService.createTrainer(user.tenantId, user.id, dto);
  }

  @Get('packages')
  async getPackages(@CurrentUser() user: any) {
    return this.trainerService.getPackages(user.tenantId);
  }

  @Post('packages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createPackage(
    @CurrentUser() user: any,
    @Body() dto: CreateTrainingPackageDto,
  ) {
    return this.trainerService.createPackage(user.tenantId, dto);
  }

  @Post('assignments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.FRONT_DESK)
  async assignPackage(
    @CurrentUser() user: any,
    @Body() dto: AssignTrainerPackageDto,
  ) {
    return this.trainerService.assignPackage(user.tenantId, dto);
  }

  @Get('schedule')
  async getSchedule(
    @CurrentUser() user: any,
    @Query('trainerProfileId') trainerProfileId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trainerService.getSchedule(user.tenantId, trainerProfileId, startDate, endDate);
  }

  @Post('sessions')
  async bookSession(
    @CurrentUser() user: any,
    @Body() dto: BookTrainingSessionDto,
  ) {
    return this.trainerService.bookSession(user.tenantId, dto);
  }

  @Patch('sessions/:id/complete')
  async completeSession(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.trainerService.completeSession(user.tenantId, id, notes);
  }

  @Patch('sessions/:id/cancel')
  async cancelSession(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.trainerService.cancelSession(user.tenantId, id, reason);
  }

  @Get(':id')
  async getTrainerById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.trainerService.getTrainerById(user.tenantId, id);
  }

  @Post('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async upsertTrainerProfile(
    @CurrentUser() user: any,
    @Body() dto: UpsertTrainerProfileDto,
  ) {
    return this.trainerService.upsertTrainerProfile(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async updateTrainer(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateTrainerDto,
  ) {
    return this.trainerService.updateTrainer(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async deleteTrainer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainerService.deleteTrainer(user.tenantId, id);
  }

  @Put(':id/availability')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.TRAINER)
  async setAvailability(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SetTrainerAvailabilityDto,
  ) {
    return this.trainerService.setAvailability(user.tenantId, id, dto);
  }
}
