import {
  CreateFeedNoteRequestBody,
  GetFeedQueryParams,
  SetFeedNoteRatingRequestBody,
} from '@later/types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  FEED_NOTE_MAX_LENGTH,
  FEED_RATING_MAX,
  FEED_RATING_MIN,
} from './feed.constants';

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

export class CreateFeedNoteDto implements CreateFeedNoteRequestBody {
  @ApiProperty({
    example: 'Investigate the mortrage in Poland',
    description: `The note content, up to ${String(FEED_NOTE_MAX_LENGTH)} characters`,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'content must not be blank' })
  @MaxLength(FEED_NOTE_MAX_LENGTH)
  content!: string;
}

export class SetFeedNoteRatingDto implements SetFeedNoteRatingRequestBody {
  @ApiProperty({
    example: 12,
    description: `The new note rating, an integer from ${String(FEED_RATING_MIN)} to ${String(FEED_RATING_MAX)}`,
  })
  @IsInt()
  @Min(FEED_RATING_MIN)
  @Max(FEED_RATING_MAX)
  rating!: number;
}
