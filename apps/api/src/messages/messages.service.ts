import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { ChatsService } from 'src/chats/chats.service';
import { UserActionsService } from 'src/user-actions/user-actions.service';
import { MessageBurndownSnapshotsService } from 'src/message-burndown-snapshots/message-burndown-snapshots.service';

import {
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
    private messageBurndownSnapshotsService: MessageBurndownSnapshotsService,
  ) {}

  // TODO: compare offset vs cursor
  async listMessages(dto: ListMessagesServiceDto) {
    await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    const offset = (dto.page - 1) * dto.pageSize;

    const resolutionFilter = getResolutionFilter(dto.resolution);

    // TODO: do I really need to do two queries here?
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

  private async getTextMessage(id: string) {
    const message = await this.prismaService.message.findUnique({
      where: { id },
      include: { textMessage: true, messageResolution: true },
    });

    if (!message) {
      throw new NotFoundException();
    }

    return message;
  }

  async createTextMessage(dto: CreateTextMessageServiceDto) {
    await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [message] = await this.prismaService.$transaction([
      this.prismaService.message.create({
        data: {
          type: 'TEXT',
          chatId: dto.chatId,
          textMessage: {
            create: { content: dto.content },
          },
        },
      }),
      this.prismaService.messageBurndownSnapshot.upsert({
        where: { userId_day: { userId: dto.userId, day: today } },
        create: {
          userId: dto.userId,
          day: today,
          createdNotes: 1,
          resolvedNotes: 0,
        },
        update: {
          createdNotes: { increment: 1 },
        },
      }),
    ]);

    await this.userActionsService.record({
      type: 'CREATE_MESSAGE',
      userId: dto.userId,
      params: { messageId: message.id, messageType: 'TEXT' },
    });

    // TODO: prob I don't need to refetch it
    const textMessage = await this.getTextMessage(message.id);
    return mapMessageModelToEntity(textMessage as DbMessageItem);
  }

  async updateTextMessage(dto: UpdateTextMessageServiceDto) {
    await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
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
    });

    // TODO: prob I don't need to refetch it
    const textMessage = await this.getTextMessage(message.id);
    return mapMessageModelToEntity(textMessage as DbMessageItem);
  }

  async resolveMessage(dto: ResolveMessageServiceDto) {
    await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    // TODO: prob I can leave it to the db unique constraint
    const alreadyResolved =
      await this.prismaService.messageResolution.findFirst({
        where: {
          messageId: dto.messageId,
        },
      });
    if (alreadyResolved) {
      throw new ConflictException('This message is already resolved');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [resolution] = await this.prismaService.$transaction([
      this.prismaService.messageResolution.create({
        data: {
          messageId: dto.messageId,
          ...(dto.note ? { note: dto.note } : {}),
        },
      }),
      this.prismaService.messageBurndownSnapshot.upsert({
        where: { userId_day: { userId: dto.userId, day: today } },
        create: {
          userId: dto.userId,
          day: today,
          createdNotes: 0,
          resolvedNotes: 1,
        },
        update: {
          resolvedNotes: { increment: 1 },
        },
      }),
    ]);

    await this.userActionsService.record({
      type: 'RESOLVE_MESSAGE',
      userId: dto.userId,
      params: {
        messageId: dto.messageId,
        resolutionId: resolution.id,
        resolvedAt: resolution.createdAt,
      },
    });
  }

  async unresolveMessage(dto: UnresolveMessageServiceDto) {
    await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    // TODO: prob I can leave it to the db unique constraint
    // Also, consider deduplication
    const alreadyResolved =
      await this.prismaService.messageResolution.findFirst({
        where: {
          messageId: dto.messageId,
        },
      });
    if (!alreadyResolved) {
      throw new ConflictException('This message is not resolved yet');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prismaService.$transaction([
      this.prismaService.messageResolution.delete({
        where: {
          id: dto.resolutionId,
          messageId: dto.messageId,
        },
      }),
      this.prismaService.messageBurndownSnapshot.upsert({
        where: { userId_day: { userId: dto.userId, day: today } },
        create: {
          userId: dto.userId,
          day: today,
          createdNotes: 0,
          resolvedNotes: -1,
        },
        update: {
          resolvedNotes: { decrement: 1 },
        },
      }),
    ]);

    await this.userActionsService.record({
      type: 'UNRESOLVE_MESSAGE',
      userId: dto.userId,
      params: {
        messageId: dto.messageId,
        unresolvedAt: new Date(),
      },
    });
  }

  async deleteMessage(dto: DeleteMessageServiceDto) {
    await this.chatsService.checkAccess({
      userId: dto.userId,
      chatId: dto.chatId,
    });

    // TODO: add cascade delete for textMessage and imageMessage
    await this.prismaService.message.delete({
      where: { id: dto.messageId },
    });

    // TODO: make the user actions stuff async
    await this.userActionsService.deleteCreateMessageAction(dto.messageId);
    await this.userActionsService.deleteResolveMessageAction(dto.messageId);
    await this.userActionsService.deleteUnresolveMessageAction(dto.messageId);
  }
}
