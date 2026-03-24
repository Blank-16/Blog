'use client';

import { useEffect } from 'react';
import authService from '@/lib/appwrite/auth';
import { login, logout, setAuthLoading } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';

export default function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setAuthLoading(true));
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
