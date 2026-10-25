import { CreateNoteRequestBody, SetNoteRatingRequestBody } from '@later/types';
import { ApiProperty } from '@nestjs/swagger';
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
  NOTE_MAX_LENGTH,
  NOTE_RATING_MAX,
  NOTE_RATING_MIN,
} from './notes.constants';

export class CreateNoteDto implements CreateNoteRequestBody {
  @ApiProperty({
    example: 'Investigate the mortrage in Poland',
    description: `The note content, up to ${String(NOTE_MAX_LENGTH)} characters`,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'content must not be blank' })
  @MaxLength(NOTE_MAX_LENGTH)
  content!: string;
}

export class SetNoteRatingDto implements SetNoteRatingRequestBody {
  @ApiProperty({
    example: 12,
    description: `The new note rating, an integer from ${String(NOTE_RATING_MIN)} to ${String(NOTE_RATING_MAX)}`,
  })
  @IsInt()
  @Min(NOTE_RATING_MIN)
  @Max(NOTE_RATING_MAX)
  rating!: number;
}
