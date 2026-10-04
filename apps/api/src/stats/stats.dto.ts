import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsTimeZone } from 'class-validator';

export class GetNotesBurndownDto {
  @ApiProperty({
    example: 'Europe/Warsaw',
    description: 'IANA timezone used to bucket notes into calendar days',
  })
  @Type(() => String)
  @IsString()
  @IsTimeZone({ message: 'timezone must be a valid IANA timezone' })
  timezone!: string;
}
