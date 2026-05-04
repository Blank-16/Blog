'use client';

import { usePathname } from 'next/navigation';

export default function BlogChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/portfolio')) return null;
  return <>{children}</>;
}
