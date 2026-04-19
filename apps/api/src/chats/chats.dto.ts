import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    example: 'Random Ideas',
    description: 'The title of the chat',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: '<3',
    description: 'An emoji (optional)',
  })
  @IsString()
  @IsOptional()
  icon?: string;
}

export class UpdateChatDto {
  @ApiProperty({
    example: 'Random Ideas',
    description: 'The title of the chat',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: '<3',
    description: 'An emoji (optional)',
  })
  @IsString()
  @IsOptional()
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
