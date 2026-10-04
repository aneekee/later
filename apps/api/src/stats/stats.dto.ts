import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsString } from 'class-validator';

const TIMEZONES = [...Intl.supportedValuesOf('timeZone'), 'UTC'];

export class GetNotesBurndownDto {
  @ApiProperty({
    example: 'Europe/Warsaw',
    description: 'IANA timezone used to bucket notes into calendar days',
  })
  @Type(() => String)
  @IsString()
  @IsIn(TIMEZONES, { message: 'timezone must be a valid IANA timezone' })
  timezone!: string;
}
