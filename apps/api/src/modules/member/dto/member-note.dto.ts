import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberNoteDto {
  @ApiProperty({ example: 'Prefers evening workout slots. Follow up regarding diet consultation.' })
  @IsString()
  @IsNotEmpty()
  note: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean = false;
}
