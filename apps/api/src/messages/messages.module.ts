import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { ChatsModule } from 'src/chats/chats.module';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule, ChatsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
