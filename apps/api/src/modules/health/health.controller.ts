import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@fitnexa/shared';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'System health snapshot',
    description:
      'Reports operational status and response times for Database, Redis, and Memory usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health snapshot successfully retrieved.',
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.getHealth();
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  async liveness(): Promise<{ status: string }> {
    return this.healthService.getLiveness();
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe' })
  async readiness(): Promise<{ status: string; database: string }> {
    return this.healthService.getReadiness();
  }
}
