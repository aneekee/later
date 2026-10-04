import {
  CreateTextMessageRequestBody,
  MoveChatMessagesRequestBody,
  MoveMessageRequestBody,
  ResolveMessageRequestBody,
  UpdateTextMessageRequestBody,
} from '@later/types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

// TODO: create a pagination dto
export class ListResolvedMessagesDto {
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

  // TODO: connect it to the shared MessageResolutionFilter
  @ApiProperty({
    example: 'resolved',
    description: 'Filter messages by resolution state',
    enum: ['both', 'resolved', 'unresolved'],
    required: false,
  })
  @IsEnum(['both', 'resolved', 'unresolved'])
  @IsOptional()
  resolution: 'both' | 'resolved' | 'unresolved' = 'unresolved';
}

export class CreateTextMessageDto implements CreateTextMessageRequestBody {
  @ApiProperty({
    example: 'Investigate the mortrage in Poland',
    description: 'The text message content',
  })
  @Type(() => String)
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class UpdateTextMessageDto implements UpdateTextMessageRequestBody {
  @ApiProperty({
    example: 'Investigate the mortrage in USA',
    description: 'New text message content',
  })
  @Type(() => String)
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class ResolveMessageDto implements ResolveMessageRequestBody {
  @ApiProperty({
    example: 'Moved to the zettelkasten system',
    description: 'How the note was resolved',
  })
  @Type(() => String)
  @IsString()
  @IsOptional()
  note?: string;
}

export class MoveMessageDto implements MoveMessageRequestBody {
  @ApiProperty({
    example: '0b5a3c1e-4f7e-4a8e-9d2b-1c3f5e7a9b0d',
    description: 'The chat to move the message to',
  })
  @IsString()
  @IsNotEmpty()
  targetChatId!: string;
}

export class MoveChatMessagesDto implements MoveChatMessagesRequestBody {
  @ApiProperty({
    example: '0b5a3c1e-4f7e-4a8e-9d2b-1c3f5e7a9b0d',
    description: 'The chat to move all the messages to',
  })
  @IsUUID()
  @IsNotEmpty()
  targetChatId!: string;
}
