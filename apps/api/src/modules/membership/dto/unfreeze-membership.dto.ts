import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UnfreezeMembershipDto {
  @ApiPropertyOptional({ example: 'Returned from travel early' })
  @IsString()
  @IsOptional()
  reason?: string;
}
