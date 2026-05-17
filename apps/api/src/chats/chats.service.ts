import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';
import { ChatModel } from 'generated/prisma/models';

import { PrismaService } from 'src/prisma/prisma.service';

import {
  CheckChatAccessServiceDto,
  CreateChatServiceDto,
  ListChatsServiceDto,
  UpdateChatServiceDto,
} from './chats.types';
import { mapChatModelToEntity } from './chats.utils';
import { UserActionsService } from 'src/user-actions/user-actions.service';

@Injectable()
export class ChatsService {
  constructor(
    private prismaService: PrismaService,
    private userActionsService: UserActionsService,
  ) {}

  async getOne(id: string) {
    const chat = await this.prismaService.chat.findUnique({
      where: {
        id,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  async checkAccess(dto: CheckChatAccessServiceDto) {
    const chat = await this.prismaService.chat.findUnique({
      where: {
        id: dto.chatId,
        userId: dto.userId,
      },
    });

    if (!chat) {
      throw new ForbiddenException("You don't have access to this chat");
    }
  }

  // TODO: compare offset vs cursor
  async listChats(dto: ListChatsServiceDto) {
    const offset = (dto.page - 1) * dto.pageSize;

    // TODO: add lastUpdatedAt field to chats table
    const [chats, totalSize] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<ChatModel[]>(
        Prisma.sql`
          SELECT id, user_id AS "userId", title, created_at AS "createdAt" FROM chats
          WHERE user_id = ${dto.userId}
          ORDER BY (
            SELECT MAX(created_at) FROM messages WHERE chat_id = chats.id
          ) DESC NULLS LAST
          LIMIT ${dto.pageSize} OFFSET ${offset}
        `,
      ),
      this.prismaService.chat.count({
        where: { userId: dto.userId },
      }),
    ]);

    return {
      list: chats.map((c) => mapChatModelToEntity(c)),
      page: dto.page,
      pageSize: dto.pageSize,
      totalSize,
    };
  }

  async createChat(dto: CreateChatServiceDto) {
    const chat = await this.prismaService.chat.create({
      data: {
        title: dto.title,
        userId: dto.userId,
      },
    });

    await this.userActionsService.record({
      type: 'CREATE_CHAT',
      userId: dto.userId,
      params: { chatId: chat.id },
    });

    return mapChatModelToEntity(chat);
  }

  async updateChat(id: string, dto: UpdateChatServiceDto) {
    await this.getOne(id);

    const chat = await this.prismaService.chat.update({
      where: {
        id,
      },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
      },
    });

    return mapChatModelToEntity(chat);
  }

  async deleteChat(id: string) {
    await this.getOne(id);

    // TODO: delete messages in the chat, or set up cascade delete in the database
    await this.prismaService.chat.delete({
      where: {
        id,
      },
    });

    await this.userActionsService.deleteCreateChatAction(id);
  }
}
