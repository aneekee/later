import { useNavigate } from 'react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

import { useLoginMutation, useRegisterMutation } from '../api/auth.api';
import { LoginForm } from '../components/LoginForm';
import { useLoginFormSchema } from '../hooks/useLoginFormSchema';
import type { LoginFormValues } from '../types/login';
import { LOGIN_FORM_DEFAULT_VALUES } from '../const/auth.constants';

export const LoginPage = () => {
  const navigate = useNavigate();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();

  const { formSchema } = useLoginFormSchema();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: LOGIN_FORM_DEFAULT_VALUES,
    mode: 'onChange',
  });

  const onLoginClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      const { username, password } = form.getValues();
      console.log('Logging in with:', { username, password });

      await login({ username, password }).unwrap();
      navigate('/');
    } catch (e) {
      console.error('Login error:', e);
      toast.error('Login failed. Please check your credentials.');
    }
  };

  const onRegisterClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      const { username, password } = form.getValues();
      console.log('Registering with:', { username, password });

      await register({ username, password }).unwrap();
      toast.success('Registration successful! You can now log in.');
    } catch (e) {
      console.error('Registration error:', e);
      toast.error('Registration failed. Please try again.');
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
              disabled={isLoginLoading}
            >
              Login
            </Button>

            <Button
              type="submit"
              className="flex-1"
              onClick={onRegisterClick}
              disabled={isRegisterLoading}
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
