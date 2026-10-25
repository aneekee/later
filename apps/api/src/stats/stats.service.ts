import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import { NotesTotals } from '@later/types';

import { GetNotesTotalsServiceDto } from './stats.types';

@Injectable()
export class StatsService {
  constructor(private prismaService: PrismaService) {}

  async getNotesTotals(dto: GetNotesTotalsServiceDto): Promise<NotesTotals> {
    const total = await this.prismaService.message.count({
      where: { userId: dto.userId },
    });

    return { total };
  }
}
