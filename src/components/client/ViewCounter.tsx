'use client';

import { useEffect, useRef } from 'react';
import appwriteService from '@/lib/appwrite/appwriteService';

export default function ViewCounter({ postId }: { postId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Fire-and-forget
    appwriteService.incrementPostViews(postId).catch(() => {});
  }, [postId]);

  return null;
}
