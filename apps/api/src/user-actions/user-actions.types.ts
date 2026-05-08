import { UserActionType } from './user-actions.schema';

export interface RecordUserActionDto {
  type: UserActionType;
  userId: string;
  params?: object;
}
