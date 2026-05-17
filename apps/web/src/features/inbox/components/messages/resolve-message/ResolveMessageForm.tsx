import { Controller, useFormContext } from 'react-hook-form';

import { Field, FieldError } from '@/shared/components/ui/field';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

import type { ResolveMessageFormValues } from '@/features/inbox/types/messages.types';

export const ResolveMessageForm = () => {
  const { control } = useFormContext<ResolveMessageFormValues>();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Controller
          name="note"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Textarea
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="How was this resolved?"
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
