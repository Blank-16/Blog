'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import authService from '@/lib/appwrite/auth';
import { login } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Logo from '@/components/ui/Logo';

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
    <div className="flex items-center justify-center w-full min-h-[70vh] px-4">
      <div className="w-full max-w-md rounded-2xl p-10 border bg-card border-edge gsap-fade-up">
        <div className="mb-2 flex justify-center">
          <Logo />
        </div>

        <h1 className="text-3xl mb-2 font-display mt-6">Create an account.</h1>
        <p className="text-sm mb-8 text-muted">
          Already have one?{' '}
          <Link
            href="/login"
            className="underline underline-offset-2 text-ink transition-opacity hover:opacity-60"
          >
            Sign in
          </Link>
        </p>

        {error && (
          <p className="text-sm text-red-500 mb-4 p-3 rounded-lg bg-red-500/10">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit(signup)} className="space-y-4">
          <Input label="Full Name" placeholder="Your name" {...register('name', { required: true })} />
          <Input
            label="Email" placeholder="you@example.com" type="email"
            {...register('email', {
              required: true,
              validate: {
                matchPattern: (v) =>
                  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) ||
                  'Please enter a valid email address',
              },
            })}
          />
          <Input label="Password" type="password" placeholder="••••••••" {...register('password', { required: true })} />
          <Button type="submit" className="w-full mt-2">Create Account</Button>
        </form>
      </div>
    </div>
  );
}
