import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelMembershipDto {
  @ApiProperty({ example: 'Relocating to another city' })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;
}
