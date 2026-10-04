import { ChatEntity } from '@later/types';

import { Prisma } from 'generated/prisma/client';

import { ChatModel } from '../../generated/prisma/models/Chat';
import { ListChatsServiceDto } from './chats.types';

export function mapChatModelToEntity(chat: ChatModel): ChatEntity {
  return {
    ...chat,
    createdAt: chat.createdAt.toISOString(),
  };
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function buildListChatsWhereSql(
  dto: Pick<ListChatsServiceDto, 'userId' | 'search' | 'excludeId'>,
) {
  const conditions = [Prisma.sql`user_id = ${dto.userId}`];

  if (dto.search) {
    conditions.push(
      Prisma.sql`title ILIKE ${`%${escapeLikePattern(dto.search)}%`}`,
    );
  }

  if (dto.excludeId) {
    conditions.push(Prisma.sql`id <> ${dto.excludeId}`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}
