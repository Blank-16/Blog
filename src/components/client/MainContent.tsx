'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortfolio = pathname.startsWith('/portfolio');

  return (
    <main className={`flex-1 ${isPortfolio ? '' : 'lg:ml-56'}`}>
      {children}
    </main>
  );
}
