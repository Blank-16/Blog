'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

interface AuthGuardProps {
  children: React.ReactNode;
  /** true = requires login, false = requires logged-out (login/signup pages) */
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

  // Show a neutral skeleton while auth state is being resolved.
  // This prevents both a blank screen and a content flash.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-label="Loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-edge border-t-ink animate-spin" />
          <p className="text-xs text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (authentication && !authStatus) return null;
  if (!authentication && authStatus) return null;

  return <>{children}</>;
}
