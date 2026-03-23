import './globals.css';
import type { Metadata } from 'next';
import StoreProvider from '@/store/StoreProvider';
import AuthInitializer from '@/components/AuthInitializer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Blogging Web',
  description: 'A full-featured blogging platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen flex flex-col">
        <StoreProvider>
          <AuthInitializer />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
