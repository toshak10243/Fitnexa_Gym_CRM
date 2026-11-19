import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { DeviceEventService } from '../services/device-event.service';
import { DeviceIngestWebhookDto } from '../dto/device-ingest.dto';

@ApiTags('Biometric Device Ingestion (Gateway / Webhook)')
@Controller('devices/ingest')
export class DeviceIngestController {
  constructor(private readonly deviceEventService: DeviceEventService) {}

  @Public()
  @Post(':deviceCode')
  @ApiOperation({ summary: 'Ingest raw attendance events from physical terminal or gateway' })
  @ApiResponse({ status: 200, description: 'Events durably staged and processed' })
  @ApiResponse({ status: 401, description: 'Invalid device auth token' })
  @ApiResponse({ status: 404, description: 'Device code not found' })
  async ingest(
    @Param('deviceCode') deviceCode: string,
    @Headers('x-device-token') headerToken: string | undefined,
    @Headers('authorization') authHeader: string | undefined,
    @Body() dto: DeviceIngestWebhookDto,
  ) {
    // Extract token from X-Device-Token or Bearer Authorization
    const rawToken = headerToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);
    return this.deviceEventService.ingestFromDevice(deviceCode, rawToken, dto);
  }
}
