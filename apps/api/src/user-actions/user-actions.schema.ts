import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserActionDocument = HydratedDocument<UserAction>;

export type UserActionType = 'CREATE_MESSAGE' | 'CREATE_CHAT';

@Schema({ versionKey: false, collection: 'user_actions' })
export class UserAction {
  @Prop({ required: true })
  type!: UserActionType;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: false, type: Object })
  params?: object;

  @Prop({ required: true })
  createdAt!: Date;
}

export const UserActionSchema = SchemaFactory.createForClass(UserAction);
