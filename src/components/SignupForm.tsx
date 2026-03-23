'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import authService from '@/lib/appwrite/auth';
import { login } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';
import Button from './Button';
import Input from './Input';
import Logo from './Logo';

interface SignupFormValues {
  name: string;
  email: string;
  password: string;
}

export default function SignupForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { register, handleSubmit } = useForm<SignupFormValues>();
  const [error, setError] = useState<string>('');

  const signup: SubmitHandler<SignupFormValues> = async (data) => {
    setError('');
    try {
      await authService.createAccount(data);
      const userData = await authService.getCurrentUser();
      if (userData) {
        dispatch(login({ userData }));
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="mx-auto w-full max-w-lg bg-gray-800 rounded-xl p-10 border border-black/10 text-white">
        <div className="mb-2 flex justify-center">
          <span className="inline-block w-full max-w-[100px]">
            <Logo />
          </span>
        </div>

        <h2 className="text-center text-2xl font-bold leading-tight">
          Sign up to create account
        </h2>
        <p className="mt-2 text-center text-base text-gray-400">
          Already have an account?&nbsp;
          <Link
            href="/login"
            className="font-medium text-white transition-all duration-200 hover:underline"
          >
            Sign In
          </Link>
        </p>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit(signup)} className="mt-8">
          <div className="space-y-5">
            <Input
              label="Full Name:"
              placeholder="Enter your full name"
              {...register('name', { required: true })}
            />
            <Input
              label="Email:"
              placeholder="Enter your email"
              type="email"
              {...register('email', {
                required: true,
                validate: {
                  matchPattern: (v) =>
                    /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) ||
                    'Email address must be a valid address',
                },
              })}
            />
            <Input
              label="Password:"
              type="password"
              placeholder="Enter your password"
              {...register('password', { required: true })}
            />
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
