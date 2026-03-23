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
      {/* No hardcoded dark class — ThemeToggle handles it client-side */}
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 min-h-screen flex flex-col transition-colors duration-200">
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
