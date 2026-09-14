import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from 'generated/prisma/client';

import { inlineParams } from './prisma.utils';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'prisma-queries.log');

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({
      adapter,
      log: [{ emit: 'event', level: 'query' }],
    });
    fs.mkdirSync(LOG_DIR, { recursive: true });
    this.$on(
      'query' as never,
      (e: { query: string; params: string; duration: number }) => {
        fs.appendFile(
          LOG_FILE,
          `-- ${e.duration.toString()}ms\n${inlineParams(e.query, e.params)};\n\n`,
          (err) => {
            if (err) {
              console.error('Failed to write Prisma query log', err);
            }
          },
        );
      },
    );
  }
}
