import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from 'generated/prisma/client';

// import { inlineParams } from './prisma.utils';

@Injectable()
export class PrismaService extends PrismaClient {
  // constructor() {
  //   const adapter = new PrismaPg({
  //     connectionString: process.env.DATABASE_URL as string,
  //   });
  //   super({
  //     adapter,
  //     log: [{ emit: 'event', level: 'query' }],
  //   });
  //   this.$on(
  //     'query' as never,
  //     (e: { query: string; params: string; duration: number }) => {
  //       console.log(
  //         `-- ${e.duration.toString()}ms\n${inlineParams(e.query, e.params)};\n`,
  //       );
  //     },
  //   );
  // }

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }
}
