import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MapDeviceMemberDto {
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: '1042', description: 'Internal ID or Card UID on physical terminal' })
  @IsString()
  @IsNotEmpty()
  deviceUserId: string;
}
