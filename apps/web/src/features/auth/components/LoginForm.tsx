import { Label } from '@/shared/components/ui/label';
import { FormInput } from '@/shared/components/FormInput';

export const LoginForm = () => {
  return (
    <form className="relative w-100 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <FormInput name="username" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <FormInput type="password" name="password" />
      </div>
    </form>
  );
};
