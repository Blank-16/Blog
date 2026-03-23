'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import authService from '@/lib/appwrite/auth';
import { login as authLogin } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';
import Button from './Button';
import Input from './Input';
import Logo from './Logo';

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
    <div className="flex items-center justify-center w-full mt-4">
      <div className="mx-auto w-full max-w-lg rounded-xl p-10 border
        bg-white border-gray-200 shadow-sm
        dark:bg-gray-800 dark:border-gray-700">

        <div className="mb-2 flex justify-center">
          <span className="inline-block w-full max-w-[100px]">
            <Logo />
          </span>
        </div>

        <h2 className="text-center text-2xl font-bold leading-tight text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-base text-gray-500 dark:text-gray-400">
          Don&apos;t have any account?&nbsp;
          <Link href="/signup" className="font-medium text-blue-600 dark:text-blue-400 hover:underline transition-all duration-200">
            Sign Up
          </Link>
        </p>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit(login)} className="mt-8">
          <div className="space-y-5">
            <Input label="Email:" placeholder="Enter your email" type="email" {...register('email', { required: true })} />
            <Input label="Password:" type="password" placeholder="Enter your password" {...register('password', { required: true })} />
            <Button type="submit" className="w-full">Sign In</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
