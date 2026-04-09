'use client';

import { useEffect } from 'react';
import authService from '@/lib/appwrite/auth';
import { login, logout } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

/**
 * Runs once on mount to resolve the current session and populate the
 * Redux auth slice. Renders nothing - purely a side-effect component.
 *
 * Note: initialState.loading is already true, so no need to dispatch
 * setAuthLoading(true) here; we only need to dispatch the resolution.
 */
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
      .catch(() => dispatch(logout()));
  }, [dispatch]);

  return null;
}
