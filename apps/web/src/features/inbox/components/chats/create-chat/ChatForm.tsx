import { FormInput } from '@/shared/components/FormInput';
import { Label } from '@/shared/components/ui/label';

export const ChatForm = () => {
  return (
    <div className="relative  space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <FormInput name="title" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <FormInput name="icon" />
      </div>
    </div>
  );
};
