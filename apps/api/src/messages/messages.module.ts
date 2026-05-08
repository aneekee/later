import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { ChatsModule } from 'src/chats/chats.module';
import { UserActionsModule } from 'src/user-actions/user-actions.module';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule, ChatsModule, UserActionsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
