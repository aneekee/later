import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserAction, UserActionSchema } from './user-actions.schema';
import { UserActionsService } from './user-actions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAction.name, schema: UserActionSchema },
    ]),
  ],
  providers: [UserActionsService],
  exports: [UserActionsService],
})
export class UserActionsModule {}
