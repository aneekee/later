import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from 'generated/prisma/client';
import { ChatModel } from 'generated/prisma/models';

import { PrismaService } from 'src/prisma/prisma.service';
import { isRecordNotFoundError } from 'src/shared/utils/prisma.utils';
import { UserActionsService } from 'src/user-actions/user-actions.service';

import {
  CheckChatAccessServiceDto,
  CreateChatServiceDto,
  DeleteChatServiceDto,
  GetOneChatServiceDto,
  ListChatsServiceDto,
  UpdateChatServiceDto,
} from './chats.types';
import { mapChatModelToEntity } from './chats.utils';

@Injectable()
export class ChatsService {
  constructor(
    private prismaService: PrismaService,
    private userActionsService: UserActionsService,
  ) {}

  async checkChatAccess(dto: CheckChatAccessServiceDto) {
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

  async getOne(dto: GetOneChatServiceDto) {
    const chat = await this.prismaService.chat.findUnique({
      where: {
        id: dto.chatId,
        userId: dto.userId,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
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

    this.userActionsService
      .record({
        type: 'CREATE_CHAT',
        userId: dto.userId,
        params: { chatId: chat.id },
      })
      .catch((error: unknown) => {
        console.error('CREATE_CHAT tracking error', error);
      });

    return mapChatModelToEntity(chat);
  }

  async updateChat(id: string, dto: UpdateChatServiceDto) {
    if (!dto.title) {
      throw new BadRequestException('Wrong chat update dto schema');
    }

    await this.checkChatAccess({
      chatId: id,
      userId: dto.userId,
    });

    try {
      const chat = await this.prismaService.chat.update({
        where: {
          id,
        },
        data: {
          title: dto.title,
        },
      });

      // TODO: don't forget to track UPDATE_CHAT event

      return mapChatModelToEntity(chat);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException('Chat not found');
      }

      throw error;
    }
  }

  async deleteChat(dto: DeleteChatServiceDto) {
    await this.checkChatAccess({
      chatId: dto.chatId,
      userId: dto.userId,
    });

    try {
      // TODO: delete messages in the chat, or set up cascade delete in the database
      // TODO: don't forget to track DELETE_CHAT event
      await this.prismaService.chat.delete({
        where: {
          id: dto.chatId,
        },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException('Chat not found');
      }

      throw error;
    }
  }
}
