import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChatStatsEntity } from '@later/types';

import { Prisma } from 'generated/prisma/client';
import { ChatModel } from 'generated/prisma/models';

import { PrismaService } from 'src/prisma/prisma.service';
import { isRecordNotFoundError } from 'src/shared/utils/prisma.utils';
import { UserActionsService } from 'src/user-actions/user-actions.service';

import {
  CheckChatAccessServiceDto,
  CreateChatServiceDto,
  DeleteChatAndMoveMessagesServiceDto,
  DeleteChatServiceDto,
  GetChatStatsServiceDto,
  GetOneChatServiceDto,
  ListChatsServiceDto,
  UpdateChatServiceDto,
} from './chats.types';
import { buildListChatsWhereSql, mapChatModelToEntity } from './chats.utils';

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
    const whereSql = buildListChatsWhereSql(dto);

    // TODO: add lastUpdatedAt field to chats table
    const [chats, countResult] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<ChatModel[]>(
        Prisma.sql`
          SELECT id, user_id AS "userId", title, created_at AS "createdAt" FROM chats
          ${whereSql}
          ORDER BY (
            SELECT MAX(created_at) FROM messages WHERE chat_id = chats.id
          ) DESC NULLS LAST, created_at DESC, id
          LIMIT ${dto.pageSize} OFFSET ${offset}
        `,
      ),
      this.prismaService.$queryRaw<[{ count: bigint }]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM chats ${whereSql}`,
      ),
    ]);

    return {
      list: chats.map((c) => mapChatModelToEntity(c)),
      page: dto.page,
      pageSize: dto.pageSize,
      totalSize: Number(countResult[0].count),
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

  async deleteChatAndMoveMessages(dto: DeleteChatAndMoveMessagesServiceDto) {
    if (dto.targetChatId === dto.chatId) {
      throw new BadRequestException(
        'The target chat must differ from the deleted one',
      );
    }

    await this.checkChatAccess({
      chatId: dto.chatId,
      userId: dto.userId,
    });

    await this.checkChatAccess({
      chatId: dto.targetChatId,
      userId: dto.userId,
    });

    try {
      await this.prismaService.$transaction([
        this.prismaService.message.updateMany({
          where: { chatId: dto.chatId },
          data: { chatId: dto.targetChatId },
        }),
        this.prismaService.chat.delete({
          where: {
            id: dto.chatId,
          },
        }),
      ]);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException('Chat not found');
      }

      throw error;
    }
  }

  async getChatStats(dto: GetChatStatsServiceDto): Promise<ChatStatsEntity> {
    await this.checkChatAccess({
      chatId: dto.chatId,
      userId: dto.userId,
    });

    const [result] = await this.prismaService.$queryRaw<
      [{ total: bigint; resolved: bigint }]
    >(
      Prisma.sql`
        SELECT COUNT(m.id) AS total, COUNT(mr.id) AS resolved
        FROM messages m
        LEFT JOIN message_resolutions mr ON mr.message_id = m.id
        WHERE m.chat_id = ${dto.chatId}
      `,
    );

    const total = Number(result.total);
    const resolved = Number(result.resolved);

    return {
      total,
      resolved,
      unresolved: total - resolved,
    };
  }
}
