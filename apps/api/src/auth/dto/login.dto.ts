import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { LoginRequestBody } from '@repo/types';

export class LoginDto implements LoginRequestBody {
  @ApiProperty({
    example: 'johndoe',
    description: 'The username of the new user',
  })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'The password for the new account',
  })
  @IsNotEmpty()
  password!: string;
}
