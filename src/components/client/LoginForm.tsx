'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import authService from '@/lib/appwrite/auth';
import { login as authLogin } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { register, handleSubmit } = useForm<LoginFormValues>();
  const [error, setError] = useState<string>('');

  const login: SubmitHandler<LoginFormValues> = async (data) => {
    setError('');
    try {
      const session = await authService.login(data);
      if (session) {
        const userData = await authService.getCurrentUser();
        if (userData) {
          dispatch(authLogin({ userData }));
          router.push('/');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-[70vh] px-4">
      <div className="w-full max-w-md rounded-2xl p-10 border bg-card border-edge gsap-fade-up">
        <div className="mb-2 flex justify-center">
          <Logo />
        </div>

        <h1 className="text-3xl mb-2 font-display mt-6">Welcome back.</h1>
        <p className="text-sm mb-8 text-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="underline underline-offset-2 text-ink transition-opacity hover:opacity-60"
          >
            Sign up
          </Link>
        </p>

        {error && (
          <p className="text-sm text-red-500 mb-4 p-3 rounded-lg bg-red-500/10">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit(login)} className="space-y-4">
          <Input label="Email" placeholder="you@example.com" type="email" {...register('email', { required: true })} />
          <Input label="Password" type="password" placeholder="••••••••" {...register('password', { required: true })} />
          <Button type="submit" className="w-full mt-2">Sign In</Button>
        </form>
      </div>
    </div>
  );
}
