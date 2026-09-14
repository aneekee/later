import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

import { CreateChatRequestBody, UpdateChatRequestBody } from '@later/types';

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
export class ListChatsDto {
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
}
