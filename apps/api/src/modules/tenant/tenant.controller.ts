import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { TenantService } from './tenant.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import {
  CurrentTenant,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@fitnexa/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Gym Tenant & Branches')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Get('lookup/:slug')
  @ApiOperation({ summary: 'Publicly check if a tenant subdomain slug exists' })
  @ApiResponse({ status: 200, description: 'Tenant lookup status.' })
  async lookupBySlug(@Param('slug') slug: string) {
    return this.tenantService.lookupBySlug(slug);
  }

  private extractClientMetadata(req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown-ip';
    const userAgent = req.get('user-agent') || 'unknown-client';
    return { ipAddress, userAgent };
  }

  @Get('profile')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current gym profile and facility settings' })
  @ApiResponse({ status: 200, description: 'Gym profile retrieved successfully.' })
  async getProfile(@CurrentTenant() tenantId: string) {
    return this.tenantService.getProfile(tenantId);
  }

  @Post('upload-logo')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload gym brand logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'branding');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = `gym-logo-${Date.now()}${ext}`;
          cb(null, cleanName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const validExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext);
        const validMime = /image\/(jpeg|jpg|png|webp|svg\+xml|svg|x-png)/i.test(file.mimetype);
        if (!validExt && !validMime) {
          return cb(
            new BadRequestException('Only JPG, PNG, WebP, or SVG logo files are permitted.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No logo file uploaded.');
    return {
      status: 'success',
      data: { logoUrl: `/uploads/branding/${file.filename}` },
    };
  }

  @Patch('profile')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update gym enterprise details (GSTIN, Address, Contacts)' })
  @ApiResponse({ status: 200, description: 'Gym profile updated successfully.' })
  async updateProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.updateProfile(tenantId, userId, dto, ipAddress, userAgent);
  }

  @Patch('role-permissions')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update granular role permissions matrix for current gym' })
  @ApiResponse({ status: 200, description: 'Role permissions matrix updated successfully.' })
  async updateRolePermissions(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body('rolePermissions') rolePermissions: Record<string, string[]>,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.updateRolePermissions(tenantId, userId, rolePermissions, ipAddress, userAgent);
  }

  @Get('branches')
  @Roles(
    UserRole.GYM_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List all facilities / branches for the gym' })
  @ApiResponse({ status: 200, description: 'List of branches.' })
  async getBranches(@CurrentTenant() tenantId: string) {
    return this.tenantService.getBranches(tenantId);
  }

  @Post('branches')
  @Roles(UserRole.GYM_OWNER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new gym facility / branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully.' })
  @ApiResponse({ status: 409, description: 'Branch code already in use.' })
  async createBranch(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBranchDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.createBranch(tenantId, userId, dto, ipAddress, userAgent);
  }

  @Patch('branches/:id')
  @Roles(UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update gym branch details' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully.' })
  async updateBranch(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBranchDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.tenantService.updateBranch(tenantId, branchId, userId, dto, ipAddress, userAgent);
  }
}
