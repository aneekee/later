import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'The username of the new user',
  })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'The password for the new account',
  })
  @IsNotEmpty()
  password: string;
}
