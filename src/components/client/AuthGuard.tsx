'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

interface AuthGuardProps {
  children: React.ReactNode;
  authentication?: boolean;
}

export default function AuthGuard({ children, authentication = true }: AuthGuardProps) {
  const router = useRouter();
  const authStatus = useAppSelector((state) => state.auth.status);
  const authLoading = useAppSelector((state) => state.auth.loading);

  useEffect(() => {
    if (authLoading) return;
    if (authentication && !authStatus) {
      router.replace('/login');
    } else if (!authentication && authStatus) {
      router.replace('/');
    }
  }, [authStatus, authLoading, authentication, router]);

  // While auth is being determined, render nothing (no flash)
  if (authLoading) return <div className="min-h-screen" />;

  if (authentication && !authStatus) return null;
  if (!authentication && authStatus) return null;

  return <>{children}</>;
}
