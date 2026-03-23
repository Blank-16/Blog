'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import Logo from './Logo';
import LogoutBtn from './LogoutBtn';
import Container from './Container';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  name: string;
  slug: string;
  active: boolean;
}

export default function Header() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const authStatus = useAppSelector((state) => state.auth.status);
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const navItems: NavItem[] = [
    { name: 'Home',      slug: '/',          active: true },
    { name: 'Login',     slug: '/login',     active: !authStatus },
    { name: 'Signup',    slug: '/signup',    active: !authStatus },
    { name: 'All Posts', slug: '/all-posts', active: authStatus },
    { name: 'Add Post',  slug: '/add-post',  active: authStatus },
  ];

  const handleNavigate = (slug: string): void => {
    router.push(slug);
    setMobileMenuOpen(false);
  };

  const navBtnClass =
    'inline-block px-6 py-2 duration-200 rounded-full ' +
    'text-gray-700 hover:bg-gray-100 ' +
    'dark:text-gray-200 dark:hover:bg-gray-800';

  return (
    <header className="py-3 shadow border-b bg-white border-gray-200 dark:bg-black dark:border-gray-700">
      <Container>
        <nav className="flex items-center">
          <div className="mr-4">
            <Link href="/"><Logo /></Link>
          </div>

          {isMobile ? (
            <>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-gray-700 dark:text-white text-3xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? '✕' : '☰'}
                </button>
              </div>

              {mobileMenuOpen && (
                <div
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}

              <div
                className={`fixed top-0 right-0 h-full w-64 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out
                  bg-white dark:bg-gray-900
                  ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
              >
                <div className="flex flex-col p-6">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="self-end text-gray-700 dark:text-white text-2xl mb-8 hover:text-gray-400"
                  >
                    ✕
                  </button>
                  {navItems.filter((i) => i.active).map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavigate(item.slug)}
                      className="text-gray-700 dark:text-white text-lg py-3 px-4 mb-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      {item.name}
                    </button>
                  ))}
                  {authStatus && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <LogoutBtn />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <ul className="flex ml-auto items-center">
              {navItems.filter((i) => i.active).map((item) => (
                <li key={item.name}>
                  <button onClick={() => router.push(item.slug)} className={navBtnClass}>
                    {item.name}
                  </button>
                </li>
              ))}
              {authStatus && <li><LogoutBtn /></li>}
              <li className="ml-2">
                <ThemeToggle />
              </li>
            </ul>
          )}
        </nav>
      </Container>
    </header>
  );
}
