import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ListMessageBurndownSnapshotsDto {
  @ApiProperty({
    example: '2026-05-01',
    description: 'Start date (inclusive, ISO date string YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({
    example: '2026-05-31',
    description: 'End date (inclusive, ISO date string YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;
}
