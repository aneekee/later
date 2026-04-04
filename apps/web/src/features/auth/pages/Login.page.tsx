import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/ui/button';

import { useLoginMutation, useRegisterMutation } from '../api/auth.api';
import { LoginForm } from '../components/LoginForm';
import { useLoginFormSchema } from '../hooks/useLoginFormSchema';
import type { LoginFormValues } from '../types/login';

/**
 *
 * - [ ] Add register
 * - [ ] Add error toasts
 * - [ ] Add registration success toast
 *
 */

export const LoginPage = () => {
  const navigate = useNavigate();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isLoading = isLoginLoading || isRegisterLoading;

  const { formSchema } = useLoginFormSchema();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
  });

  const onLoginClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      await login({ username, password }).unwrap();
      navigate('/');
    } catch (e) {
      console.error('Login error:', e);
      // TODO: Show error toast
    }
  };

  const onRegisterClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      await register({ username, password }).unwrap();
      // TODO: Show registration success toast
    } catch (e) {
      console.error('Registration error:', e);
      // TODO: Show error toast
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-muted-foreground text-sm">
            Please enter your credentials to log in.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          <FormProvider {...form}>
            <LoginForm />
          </FormProvider>

          <div className="w-full flex gap-4">
            <Button
              type="submit"
              variant="outline"
              className="flex-1"
              onClick={onLoginClick}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Login'}
            </Button>

            <Button
              type="submit"
              className="flex-1"
              onClick={onRegisterClick}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Register'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
