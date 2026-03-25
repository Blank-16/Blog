'use client';

import { useRouter } from 'next/navigation';
import authService from '@/lib/appwrite/auth';
import { logout } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

export default function LogoutBtn() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await authService.logout();
    dispatch(logout());
    router.push('/');
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-1.5 text-sm rounded-full text-muted transition-colors hover:text-ink"
    >
      Logout
    </button>
  );
}
