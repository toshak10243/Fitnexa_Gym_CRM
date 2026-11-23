import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('jwt.secret') ||
          'fitnexa-development-secret-key-min-32-chars-long-2026',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiration') || '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RateLimitGuard, PasswordResetService],
  exports: [AuthService, JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}
