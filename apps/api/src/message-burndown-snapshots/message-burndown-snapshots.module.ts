import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';

import { MessageBurndownSnapshotsController } from './message-burndown-snapshots.controller';
import { MessageBurndownSnapshotsService } from './message-burndown-snapshots.service';

@Module({
  imports: [PrismaModule],
  controllers: [MessageBurndownSnapshotsController],
  providers: [MessageBurndownSnapshotsService],
  exports: [MessageBurndownSnapshotsService],
})
export class MessageBurndownSnapshotsModule {}
