import { Controller, useFormContext } from 'react-hook-form';

import { Field, FieldError } from '@/shared/components/ui/field';
import { Label } from '@/shared/components/ui/label';

import type { MoveToChatFormValues } from '@/features/inbox/types/chats.types';

import { ChatCombobox } from './ChatCombobox';

interface Props {
  excludeChatId: string;
}

export const MoveToChatForm = ({ excludeChatId }: Props) => {
  const { control } = useFormContext<MoveToChatFormValues>();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="targetChatId">Chat</Label>
        <Controller
          name="targetChatId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <ChatCombobox
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                excludeChatId={excludeChatId}
                invalid={fieldState.invalid}
              />
              {fieldState.error ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </div>
    </div>
  );
};
