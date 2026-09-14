import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { ChatsService } from 'src/chats/chats.service';
import { UserActionsService } from 'src/user-actions/user-actions.service';
import {
  isRecordNotFoundError,
  isUniqueConstraintError,
} from 'src/shared/utils/prisma.utils';
import {
  CheckMessageAccessServiceDto,
  CheckMessageResolutionAccessServiceDto,
  CreateTextMessageServiceDto,
  DeleteMessageServiceDto,
  ListMessagesServiceDto,
  ListResolvedMessagesServiceDto,
  DbMessagesList,
  DbMessageItem,
  DbResolvedMessagesList,
  ResolveMessageServiceDto,
  UpdateTextMessageServiceDto,
  UnresolveMessageServiceDto,
} from './messages.types';
import {
  getResolutionFilter,
  mapMessageModelToEntity,
  mapResolvedMessageModelToEntity,
} from './messages.utils';

/**
 *
 * After the checkAccess refactoring I don't like the structure
 * It's not obvious that checkAccess throws AND we execute the code below ONLY if the check passes
 * The if check was uglier but more readable IMO
 *
 */
@Injectable()
export class MessagesService {
  constructor(
    private prismaService: PrismaService,
    private chatsService: ChatsService,
    private userActionsService: UserActionsService,
  ) {}

  async checkMessageAccess(dto: CheckMessageAccessServiceDto) {
    const message = await this.prismaService.message.findUnique({
      where: {
        id: dto.messageId,
        chatId: dto.chatId,
        chat: { userId: dto.userId },
      },
    });

    if (!message) {
      throw new ForbiddenException("You don't have access to this message");
    }
  }

  async checkMessageResolutionAccess(
    dto: CheckMessageResolutionAccessServiceDto,
  ) {
    const resolution = await this.prismaService.messageResolution.findUnique({
      where: {
        id: dto.resolutionId,
        messageId: dto.messageId,
        message: { chatId: dto.chatId, chat: { userId: dto.userId } },
      },
    });

    if (!resolution) {
      throw new ForbiddenException(
        "You don't have access to this message resolution",
      );
    }
  }

  // TODO: compare offset vs cursor
  async listMessages(dto: ListMessagesServiceDto) {
    await this.chatsService.checkChatAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    const offset = (dto.page - 1) * dto.pageSize;

    const resolutionFilter = getResolutionFilter(dto.resolution);

    const [messages, totalSize] = await this.prismaService.$transaction([
      this.prismaService.message.findMany({
        where: {
          chatId: dto.chatId,
          ...resolutionFilter,
        },
        include: { textMessage: true, messageResolution: true },
        orderBy: { createdAt: 'desc' },
        take: dto.pageSize,
        skip: offset,
      }),
      this.prismaService.message.count({
        where: {
          chatId: dto.chatId,
          ...resolutionFilter,
        },
      }),
    ]);

    return {
      list: (messages as DbMessagesList).map(mapMessageModelToEntity),
      page: dto.page,
      pageSize: dto.pageSize,
      totalSize,
    };
  }

  async listResolvedMessages(dto: ListResolvedMessagesServiceDto) {
    const offset = (dto.page - 1) * dto.pageSize;

    const [messages, totalSize] = await this.prismaService.$transaction([
      // TODO: add ownerId to the resolved messages table
      this.prismaService.message.findMany({
        where: {
          chat: { userId: dto.userId },
          messageResolution: { isNot: null },
        },
        include: { textMessage: true, messageResolution: true, chat: true },
        orderBy: { messageResolution: { createdAt: 'desc' } },
        take: dto.pageSize,
        skip: offset,
      }),
      this.prismaService.message.count({
        where: {
          chat: { userId: dto.userId },
          messageResolution: { isNot: null },
        },
      }),
    ]);

    return {
      list: (messages as DbResolvedMessagesList).map(
        mapResolvedMessageModelToEntity,
      ),
      page: dto.page,
      pageSize: dto.pageSize,
      totalSize,
    };
  }

  async createTextMessage(dto: CreateTextMessageServiceDto) {
    await this.chatsService.checkChatAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    const message = await this.prismaService.message.create({
      data: {
        type: 'TEXT',
        chatId: dto.chatId,
        textMessage: {
          create: { content: dto.content },
        },
      },
      include: { textMessage: true, messageResolution: true },
    });

    this.userActionsService
      .record({
        type: 'CREATE_MESSAGE',
        userId: dto.userId,
        params: { messageId: message.id, messageType: 'TEXT' },
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return mapMessageModelToEntity(message as DbMessageItem);
  }

  async updateTextMessage(dto: UpdateTextMessageServiceDto) {
    await this.checkMessageAccess({
      userId: dto.userId,
      chatId: dto.chatId,
      messageId: dto.messageId,
    });

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
      include: { textMessage: true, messageResolution: true },
    });

    return mapMessageModelToEntity(message as DbMessageItem);
  }

  async resolveMessage(dto: ResolveMessageServiceDto) {
    await this.checkMessageAccess({
      userId: dto.userId,
      chatId: dto.chatId,
      messageId: dto.messageId,
    });

    let resolution;
    try {
      resolution = await this.prismaService.messageResolution.create({
        data: {
          messageId: dto.messageId,
          ...(dto.note ? { note: dto.note } : {}),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('This message is already resolved');
      }

      throw error;
    }

    this.userActionsService
      .record({
        type: 'RESOLVE_MESSAGE',
        userId: dto.userId,
        params: {
          messageId: dto.messageId,
          resolutionId: resolution.id,
          resolvedAt: resolution.createdAt,
        },
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }

  async unresolveMessage(dto: UnresolveMessageServiceDto) {
    await this.checkMessageResolutionAccess({
      userId: dto.userId,
      chatId: dto.chatId,
      messageId: dto.messageId,
      resolutionId: dto.resolutionId,
    });

    try {
      await this.prismaService.messageResolution.delete({
        where: {
          id: dto.resolutionId,
        },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ConflictException('This message is not resolved yet');
      }

      throw error;
    }

    this.userActionsService
      .record({
        type: 'UNRESOLVE_MESSAGE',
        userId: dto.userId,
        params: {
          messageId: dto.messageId,
          unresolvedAt: new Date(),
        },
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }

  async deleteMessage(dto: DeleteMessageServiceDto) {
    await this.checkMessageAccess({
      userId: dto.userId,
      chatId: dto.chatId,
      messageId: dto.messageId,
    });

    await this.prismaService.message.delete({
      where: { id: dto.messageId },
    });
  }
}
