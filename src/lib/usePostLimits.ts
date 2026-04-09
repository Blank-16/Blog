"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import appwriteService from "@/lib/appwrite/appwriteService";

export const DAILY_LIMIT = 1;
export const WEEKLY_LIMIT = 5;

export interface PostLimits {
  loading: boolean;
  isAdmin: boolean;
  todayCount: number;
  weekCount: number;
  /** False only when a limit is hit AND the user is not an admin. */
  canPost: boolean;
  /** Human-readable reason when canPost is false, otherwise null. */
  limitReason: string | null;
}

export function usePostLimits(): PostLimits {
  const userData = useAppSelector((s) => s.auth.userData);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [todayCount, setToday] = useState(0);
  const [weekCount, setWeek] = useState(0);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      setLoading(true);
      const [adminStatus, today, week] = await Promise.all([
        appwriteService.isAdmin(userData.$id),
        appwriteService.getPostCountToday(userData.$id),
        appwriteService.getPostCountThisWeek(userData.$id),
      ]);
      if (cancelled) return;
      setIsAdmin(adminStatus);
      setToday(today);
      setWeek(week);
      setLoading(false);
    };

    check();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.$id]);

  // While loading we must not evaluate limits - isAdmin is still false
  // even for admins, which would cause a brief "limit reached" flash.
  if (loading) {
    return { loading: true, isAdmin: false, todayCount: 0, weekCount: 0, canPost: true, limitReason: null };
  }

  // Admins are never limited
  if (isAdmin) {
    return { loading: false, isAdmin: true, todayCount, weekCount, canPost: true, limitReason: null };
  }

  let limitReason: string | null = null;
  if (todayCount >= DAILY_LIMIT) {
    limitReason = `You've reached your daily limit of ${DAILY_LIMIT} post. Come back tomorrow!`;
  } else if (weekCount >= WEEKLY_LIMIT) {
    limitReason = `You've reached your weekly limit of ${WEEKLY_LIMIT} posts. Try again next week!`;
  }

  return { loading: false, isAdmin: false, todayCount, weekCount, canPost: limitReason === null, limitReason };
}
