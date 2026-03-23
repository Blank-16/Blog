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
      className="inline-block px-6 py-2 duration-200 hover:bg-gray-900 rounded-full"
    >
      Logout
    </button>
  );
}
