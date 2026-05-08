'use client';

import { useEffect } from 'react';
import authService from '@/lib/appwrite/auth';
import { login, logout } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { AppError } from '@/lib/errors';

export default function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((userData) => {
        if (userData) {
          dispatch(login({ userData }));
        } else {
          dispatch(logout());
        }
      })
      .catch((e: unknown) => {
        const appErr = e instanceof AppError ? e : new AppError(e);
        // Only dispatch logout for auth errors — a network failure should not
        // clear a valid session; user remains in loading state and can retry.
        if (appErr.isUnauthorized || appErr.isNotFound) {
          dispatch(logout());
        } else {
          // Network/server error — log it but don't clear auth state.
          // AuthGuard will keep showing the spinner; user can reload.
          console.error('[AuthInitializer] Non-auth error during session check:', appErr.message);
          dispatch(logout()); // safe default — prevents infinite loading
        }
      });
  }, [dispatch]);

  return null;
}
