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

export interface DeleteMessageServiceDto {
  messageId: string;
  chatId: string;
  userId: string;
}

export type MessageWithTextMessage = {
  id: string;
  createdAt: Date;
  type: 'TEXT';
  chatId: string;
  textMessage: {
    id: string;
    messageId: string;
    content: string;
  };
};

export type MessagesList = MessageWithTextMessage[];
