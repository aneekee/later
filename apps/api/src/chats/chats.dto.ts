import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    example: 'Random Ideas',
    description: 'The title of the chat',
  })
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: '<3',
    description: 'An emoji (optional)',
  })
  icon?: string;
}

export class UpdateChatDto {
  @ApiProperty({
    example: 'Random Ideas',
    description: 'The title of the chat',
  })
  @IsNotEmpty()
  title?: string;

  @ApiProperty({
    example: '<3',
    description: 'An emoji (optional)',
  })
  icon?: string;
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
  page: number = 1;

  @ApiProperty({
    example: 20,
    description: 'Number of items per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 20;
}
