import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '@fitnexa/shared';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  recipientType: 'MEMBER' | 'STAFF';

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel = NotificationChannel.IN_APP;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpsertNotificationPreferenceDto {
  @IsBoolean()
  @IsOptional()
  optOutSms?: boolean;

  @IsBoolean()
  @IsOptional()
  optOutEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  optOutWhatsApp?: boolean;
}
