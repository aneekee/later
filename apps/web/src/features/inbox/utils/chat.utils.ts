import type { ChatStatsEntity, CreateChatRequestBody } from '@later/types';
import type { CreateChatFormValues } from '../types/chats.types';

export const mapChatFormToCreateChatDto = (
  formValues: CreateChatFormValues,
): CreateChatRequestBody => ({
  title: formValues.title,
});

export const pluralizeNotes = (count: number) =>
  `${count.toString()} ${count === 1 ? 'note' : 'notes'}`;

export const buildStatsDescription = (title: string, stats: ChatStatsEntity) =>
  `'${title}' has ${pluralizeNotes(stats.total)} (${stats.resolved.toString()} resolved and ${stats.unresolved.toString()} unresolved). These notes will be deleted with the chat unless you move them to another chat.`;
