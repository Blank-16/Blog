'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/lib/appwrite/auth';
import { logout } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

export default function LogoutBtn() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async (): Promise<void> => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
      dispatch(logout());
      router.push('/');
    } catch {
      // Session may already be expired - clear local state regardless
      dispatch(logout());
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="px-4 py-1.5 text-sm rounded-full text-muted transition-colors hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
