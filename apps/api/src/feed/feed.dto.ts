import { GetFeedQueryParams } from '@later/types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

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
}
