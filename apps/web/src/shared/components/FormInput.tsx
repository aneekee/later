import { Controller, useFormContext } from 'react-hook-form';

import { Field, FieldDescription, FieldError } from './ui/field';
import { Input } from './ui/input';

interface Props {
  name: string;
  type?: React.HTMLInputTypeAttribute;
  description?: string;
  placeholder?: string;
}

export const FormInput = ({
  name,
  type = 'text',
  description,
  placeholder,
}: Props) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Input
            {...field}
            id={field.name}
            type={type}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
          />
          <FieldDescription>{description}</FieldDescription>
          {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  );
};
