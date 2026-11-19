import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationService } from '../services/notification.service';
import {
  SendNotificationDto,
  UpsertNotificationPreferenceDto,
} from '../dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('feed')
  async getFeed(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getFeed(
      user.tenantId,
      user.userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('send')
  async sendNotification(
    @CurrentUser() user: any,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationService.dispatchNotification(user.tenantId, dto);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(user.tenantId, id);
  }

  @Post('mark-all-read')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.tenantId, user.userId);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    return this.notificationService.getPreferences(user.tenantId, user.userId);
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpsertNotificationPreferenceDto,
  ) {
    return this.notificationService.updatePreferences(user.tenantId, dto, user.userId);
  }
}
