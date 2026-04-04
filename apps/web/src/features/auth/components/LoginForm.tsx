import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useFormContext } from 'react-hook-form';

import type { LoginFormValues } from '../types/login';

export const LoginForm = () => {
  const { register } = useFormContext<LoginFormValues>();

  return (
    <form className="relative w-100 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input type="text" {...register('username')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input type="password" {...register('password')} />
      </div>
    </form>
  );
};
