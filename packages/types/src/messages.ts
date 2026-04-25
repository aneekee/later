import { BaseSuccessResponse, SuccessListResponse } from "./shared";

export type MessageType = "TEXT";

export type AbstractMessageEntity = {
  id: string;
  type: MessageType;
  chatId: string;
  createdAt: string;
};

export type TextMessageEntity = AbstractMessageEntity & {
  type: "TEXT";
  textMessage: {
    id: string;
    messageId: string;
    content: string;
  };
};

export type MessageEntity = TextMessageEntity;

// list messages

export interface ListMessagesSuccessResponse extends SuccessListResponse<MessageEntity> {}

// create message

export interface CreateTextMessageRequestBody {
  content: string;
}

export interface CreateTextMessageSuccessResponseData {
  message: TextMessageEntity;
}

export interface CreateTextMessageSuccessResponse extends BaseSuccessResponse<CreateTextMessageSuccessResponseData> {}

// update message

export interface UpdateTextMessageRequestBody {
  content: string;
}

export interface UpdateTextMessageSuccessResponseData {
  message: TextMessageEntity;
}

export interface UpdateTextMessageSuccessResponse extends BaseSuccessResponse<UpdateTextMessageSuccessResponseData> {}

// delete message

export interface DeleteMessageSuccessResponse extends BaseSuccessResponse {}
