import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// TODO: create a pagination dto
export class ListMessagesDto {
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

export class CreateTextMessageDto {
  @ApiProperty({
    example: 'Investigate the mortrage in Poland',
    description: 'The text message content',
  })
  @Type(() => String)
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class UpdateTextMessageDto {
  @ApiProperty({
    example: 'Investigate the mortrage in USA',
    description: 'New text message content',
  })
  @Type(() => String)
  @IsString()
  @IsNotEmpty()
  content!: string;
}
