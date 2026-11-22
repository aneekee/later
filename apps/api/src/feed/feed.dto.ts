import { GetFeedQueryParams } from '@later/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetFeedDto implements GetFeedQueryParams {
  @ApiProperty({
    example: 10,
    description: 'Number of notes to return',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 10;

  @ApiPropertyOptional({
    example: '2026-11-22T10:00:00.000Z',
    description:
      "The visit's start, the first page's servedAt. Notes seen at or after it are skipped",
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  since?: string;
}
