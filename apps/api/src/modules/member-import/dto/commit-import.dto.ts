import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommitImportDto {
  @ApiProperty({ example: 'batch-uuid-123' })
  @IsString()
  @IsNotEmpty()
  batchId: string;
}
