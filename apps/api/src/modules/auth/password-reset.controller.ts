import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { PasswordResetService } from './password-reset.service';

export class RequestResetDto {
  @IsIn(['SUPER_ADMIN', 'TENANT']) accountType: 'SUPER_ADMIN' | 'TENANT';
  @IsEmail() @MaxLength(100) email: string;
  @ValidateIf(o => o.accountType === 'TENANT') @IsString() @Matches(/^[a-z0-9][a-z0-9-]{0,62}$/) subdomain?: string;
}
export class VerifyResetDto {
  @IsUUID() challengeId: string;
  @Matches(/^\d{6}$/) otp: string;
}
export class CompleteResetDto {
  @Matches(/^[a-f0-9]{64}$/) resetToken: string;
  @IsString() @MinLength(8) @MaxLength(72)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/) newPassword: string;
  @IsString() @MaxLength(72) confirmPassword: string;
}

@Public()
@Controller('auth/password-reset')
@UseGuards(RateLimitGuard)
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}
  @Post('request') @HttpCode(200) @RateLimit({ limit: 5, ttlSeconds: 60 })
  request(@Body() dto: RequestResetDto) { return this.service.request(dto); }
  @Post('verify') @HttpCode(200) @RateLimit({ limit: 10, ttlSeconds: 60 })
  verify(@Body() dto: VerifyResetDto) { return this.service.verify(dto); }
  @Post('complete') @HttpCode(200) @RateLimit({ limit: 5, ttlSeconds: 60 })
  complete(@Body() dto: CompleteResetDto) { return this.service.complete(dto); }
}
