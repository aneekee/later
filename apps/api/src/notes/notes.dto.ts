import { CreateNoteRequestBody, SetNoteTierRequestBody } from '@later/types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { NoteTier } from 'generated/prisma/client';

import { NOTE_MAX_LENGTH } from './notes.constants';

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

export class SetNoteTierDto implements SetNoteTierRequestBody {
  @ApiProperty({
    enum: NoteTier,
    example: 'A',
    description: 'The new note tier, S is the highest',
  })
  @IsEnum(NoteTier)
  tier!: NoteTier;
}
