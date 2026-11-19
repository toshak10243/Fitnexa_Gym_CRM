import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractClientMetadata(req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown-ip';
    const userAgent = req.get('user-agent') || 'unknown-client';
    return { ipAddress, userAgent };
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @Post('register-owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Onboard new Gym Business & Register Gym Owner account',
  })
  @ApiResponse({ status: 201, description: 'Gym & Owner successfully registered.' })
  @ApiResponse({ status: 409, description: 'Email address already in use.' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded.' })
  async registerOwner(@Body() dto: RegisterOwnerDto, @Req() req: Request) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.authService.registerOwner(dto, ipAddress, userAgent);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account.' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded.' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, ttlSeconds: 60 })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and refresh JWT access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refresh(@Body('refreshToken') refreshToken: string, @Req() req: Request) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    return this.authService.refreshToken(refreshToken, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logout(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    await this.authService.logout(userId, tenantId, ipAddress, userAgent);
    return { success: true, message: 'Successfully logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user & gym tenant profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  async getMe(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password successfully updated.' })
  @ApiResponse({ status: 400, description: 'Invalid current password.' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = this.extractClientMetadata(req);
    await this.authService.changePassword(userId, tenantId, dto, ipAddress, userAgent);
    return { success: true, message: 'Password updated successfully' };
  }
}
