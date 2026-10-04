import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  CreateChatRequestBody,
  ListChatsQueryParams,
  UpdateChatRequestBody,
} from '@later/types';

export class CreateChatDto implements CreateChatRequestBody {
  @ApiProperty({
    example: 'Random Ideas',
    description: 'The title of the chat',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class UpdateChatDto implements UpdateChatRequestBody {
  @ApiProperty({
    example: 'Random Ideas',
    description: 'The title of the chat',
  })
  @IsString()
  title!: string;
}

// TODO: create a pagination dto
export class ListChatsDto implements ListChatsQueryParams {
  @ApiProperty({
    example: 1,
    description: 'Page number (1-based)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiProperty({
    example: 20,
    description: 'Number of items per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize: number = 20;

  @ApiProperty({
    example: 'ideas',
    description: 'Case-insensitive substring of the chat title',
    required: false,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @ApiProperty({
    example: '0b5a3c1e-4f7e-4a8e-9d2b-1c3f5e7a9b0d',
    description: 'Chat id to exclude from the list',
    required: false,
  })
  @IsString()
  @IsOptional()
  excludeId?: string;
}
