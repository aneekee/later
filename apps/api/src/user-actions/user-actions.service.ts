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
}
