'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import Logo from './Logo';
import LogoutBtn from './LogoutBtn';
import Container from './Container';

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

  return (
    <header className="py-3 shadow bg-black border-b border-gray-500">
      <Container>
        <nav className="flex items-center">
          <div className="mr-4">
            <Link href="/"><Logo /></Link>
          </div>

          {isMobile ? (
            <>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-auto text-white text-3xl p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>

              {mobileMenuOpen && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}

              <div
                className={`fixed top-0 right-0 h-full w-64 bg-white/5 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                  mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <div className="flex flex-col p-6">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="self-end text-white text-2xl mb-8 hover:text-gray-400"
                  >
                    ✕
                  </button>
                  {navItems
                    .filter((i) => i.active)
                    .map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleNavigate(item.slug)}
                        className="text-white text-lg py-3 px-4 mb-2 text-left hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        {item.name}
                      </button>
                    ))}
                  {authStatus && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <LogoutBtn />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <ul className="flex ml-auto">
              {navItems
                .filter((i) => i.active)
                .map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => router.push(item.slug)}
                      className="inline-block px-6 py-2 duration-200 hover:bg-gray-900 rounded-full"
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              {authStatus && (
                <li>
                  <LogoutBtn />
                </li>
              )}
            </ul>
          )}
        </nav>
      </Container>
    </header>
  );
}
