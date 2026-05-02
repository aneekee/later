import type { CreateChatRequestBody } from '@later/types';
import type { CreateChatFormValues } from '../types/chats.types';

export const mapChatFormToCreateChatDto = (
  formValues: CreateChatFormValues,
): CreateChatRequestBody => ({
  title: formValues.title,
  icon: formValues.icon,
});
