import type { ResolveMessageFormValues } from '../types/messages.types';

export const URL_REGEX = /https?:\/\/[^\s]+/g;

export const RESOLVE_MESSAGE_FORM_DEFAULT_VALUES: ResolveMessageFormValues = {
  note: '',
};
