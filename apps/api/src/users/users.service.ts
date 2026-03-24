import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './users.types';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  findById(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  findByUsername(username: string) {
    return this.prismaService.user.findUnique({
      where: {
        username,
      },
    });
  }

  create({ username, passwordHash }: CreateUserDto) {
    return this.prismaService.user.create({
      data: {
        username,
        password: passwordHash,
      },
    });
  }
}
