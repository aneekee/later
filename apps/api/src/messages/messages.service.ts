import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';
import { MessageModel } from 'generated/prisma/models';

import { PrismaService } from 'src/prisma/prisma.service';
import { ChatsService } from 'src/chats/chats.service';

import {
  CreateTextMessageServiceDto,
  DeleteMessageServiceDto,
  ListMessagesServiceDto,
  UpdateTextMessageServiceDto,
} from './messages.types';

@Injectable()
export class MessagesService {
  constructor(
    private prismaService: PrismaService,
    private chatsService: ChatsService,
  ) {}

  // TODO: compare offset vs cursor
  async listMessages(dto: ListMessagesServiceDto) {
    // TODO: share the hasAccess check
    const hasAccess = await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });
    if (!hasAccess) {
      throw new ForbiddenException("You don't have access to this chat");
    }

    const offset = (dto.page - 1) * dto.pageSize;

    const [messages, totalSize] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<MessageModel[]>(
        Prisma.sql`
        SELECT * FROM messages m
        INNER JOIN text_messages tm on tm.message_id = m.id
        WHERE m.chat_id = ${dto.chatId}
        ORDER BY m.created_at DESC
        LIMIT ${dto.pageSize} OFFSET ${offset}
        `,
      ),
      this.prismaService.message.count({
        where: {
          chatId: dto.chatId,
        },
      }),
    ]);

    return {
      list: messages,
      page: dto.page,
      pageSize: dto.pageSize,
      totalSize,
    };
  }

  private async getTextMessage(id: string) {
    const message = await this.prismaService.message.findUnique({
      where: { id },
      include: { textMessage: true },
    });

    if (!message) {
      throw new NotFoundException();
    }

    return message;
  }

  async createTextMessage(dto: CreateTextMessageServiceDto) {
    // TODO: share the hasAccess check
    const hasAccess = await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });
    if (!hasAccess) {
      throw new ForbiddenException("You don't have access to this chat");
    }

    const message = await this.prismaService.message.create({
      data: {
        type: 'TEXT',
        chatId: dto.chatId,
        textMessage: {
          create: { content: dto.content },
        },
      },
    });

    // TODO: prob I don't need to refetch it
    const textMessage = await this.getTextMessage(message.id);
    return textMessage;
  }

  async updateTextMessage(dto: UpdateTextMessageServiceDto) {
    // TODO: share the hasAccess check
    const hasAccess = await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });
    if (!hasAccess) {
      throw new ForbiddenException("You don't have access to this chat");
    }

    const message = await this.prismaService.message.update({
      data: {
        textMessage: {
          update: {
            content: dto.content,
          },
        },
      },
      where: {
        id: dto.messageId,
        chatId: dto.chatId,
      },
    });

    // TODO: prob I don't need to refetch it
    const textMessage = await this.getTextMessage(message.id);
    return textMessage;
  }

  async deleteMessage(dto: DeleteMessageServiceDto) {
    // TODO: share the hasAccess check
    const hasAccess = await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });
    if (!hasAccess) {
      throw new ForbiddenException("You don't have access to this chat");
    }

    // TODO: add cascade delete for textMessage and imageMessage
    await this.prismaService.message.delete({
      where: { id: dto.messageId },
    });
  }
}
