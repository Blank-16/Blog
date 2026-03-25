import './globals.css';
import type { Metadata } from 'next';
import StoreProvider from '@/store/StoreProvider';
import AuthInitializer from '@/components/client/AuthInitializer';
import Header from '@/components/client/Header';
import Footer from '@/components/ui/Footer';
import SmoothScroll from '@/components/client/SmoothScroll';

export const metadata: Metadata = {
  title: 'Blogging Web',
  description: 'A full-featured blogging platform',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-base text-ink font-body min-h-screen flex flex-col transition-colors duration-300">
        <StoreProvider>
          <AuthInitializer />
          <SmoothScroll />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
