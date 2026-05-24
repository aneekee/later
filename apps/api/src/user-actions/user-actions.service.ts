import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserAction, UserActionDocument } from './user-actions.schema';
import { RecordUserActionDto } from './user-actions.types';

@Injectable()
export class UserActionsService {
  constructor(
    @InjectModel(UserAction.name)
    private readonly userActionModel: Model<UserActionDocument>,
  ) {}

  async record(dto: RecordUserActionDto): Promise<void> {
    await this.userActionModel.create({
      ...dto,
      createdAt: new Date(),
    });
  }

  // TODO: move the messages actions stuff to a separate messaging user actions service
  async deleteCreateMessageAction(messageId: string): Promise<void> {
    await this.userActionModel.deleteMany({
      type: 'CREATE_MESSAGE',
      'params.messageId': messageId,
    });
  }

  async deleteResolveMessageAction(messageId: string): Promise<void> {
    await this.userActionModel.deleteMany({
      type: 'RESOLVE_MESSAGE',
      'params.messageId': messageId,
    });
  }

  async deleteUnresolveMessageAction(messageId: string): Promise<void> {
    await this.userActionModel.deleteMany({
      type: 'UNRESOLVE_MESSAGE',
      'params.messageId': messageId,
    });
  }

  // TODO: move the chats actions stuff to a separate messaging user actions service
  async deleteCreateChatAction(chatId: string): Promise<void> {
    await this.userActionModel.deleteMany({
      type: 'CREATE_CHAT',
      'params.chatId': chatId,
    });
  }
}
