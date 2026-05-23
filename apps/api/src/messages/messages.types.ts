import { MessageType } from '@later/types';

export interface ListMessagesServiceDto {
  chatId: string;
  userId: string;
  page: number;
  pageSize: number;
}

export interface CreateTextMessageServiceDto {
  content: string;
  chatId: string;
  userId: string;
}

export interface UpdateTextMessageServiceDto {
  content: string;
  chatId: string;
  messageId: string;
  userId: string;
}

export interface ResolveMessageServiceDto {
  messageId: string;
  chatId: string;
  userId: string;
  note?: string;
}

export interface UnresolveMessageServiceDto {
  messageId: string;
  chatId: string;
  userId: string;
  resolutionId: string;
}

export interface DeleteMessageServiceDto {
  messageId: string;
  chatId: string;
  userId: string;
}

// @TODO: use the Prisma types instead
export type DbMessageResolution = {
  id: string;
  messageId: string;
  note: string;
  createdAt: Date;
};

export type DbAbstractMessageItem = {
  id: string;
  type: MessageType;
  chatId: string;
  createdAt: Date;
  messageResolution?: DbMessageResolution;
};

export type DbTextMessageItem = DbAbstractMessageItem & {
  textMessage: {
    id: string;
    messageId: string;
    content: string;
  };
};

export type DbMessageItem = DbTextMessageItem;

export type DbMessagesList = DbMessageItem[];
