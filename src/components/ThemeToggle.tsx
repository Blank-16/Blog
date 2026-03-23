'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);

  // On mount, read saved preference (or system preference)
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="p-2 rounded-full transition-colors
        text-gray-700 hover:bg-gray-200
        dark:text-gray-300 dark:hover:bg-gray-700"
    >
      {dark ? (
        /* Sun icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l.71.71M6.34 6.34l.71.71M12 7a5 5 0 100 10A5 5 0 0012 7z" />
        </svg>
      ) : (
        /* Moon icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      )}
    </button>
  );
}
