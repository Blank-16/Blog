'use client';

import { useState, useEffect } from 'react';

const TIMEZONE = 'Asia/Kolkata';
const LOCALE = 'en-IN';

export default function LiveClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(LOCALE, {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }));
      setDate(now.toLocaleDateString(LOCALE, {
        timeZone: TIMEZONE,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="flex items-center gap-1.5 text-[12px] text-[#777]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#444] inline-block flex-shrink-0" />
      <span>IST</span>
      <span className="text-[#555] mx-1">/</span>
      <span className="text-[#999] tabular-nums">{time}</span>
      <span className="text-[#555] mx-1">·</span>
      <span className="text-[#777]">{date}</span>
    </div>
  );
}
