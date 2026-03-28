"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAppSelector } from "@/store/hooks";
import Logo from "@/components/ui/Logo";
import LogoutBtn from "@/components/client/LogoutBtn";
import Container from "@/components/ui/Container";
import ThemeToggle from "@/components/client/ThemeToggle";

interface NavItem {
  name: string;
  slug: string;
  active: boolean;
}

// Animated hamburger icon
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-5 h-4 flex flex-col justify-between cursor-pointer">
      <span
        className={`block h-0.5 bg-ink rounded-full origin-left transition-all duration-300 ease-in-out
          ${open ? "rotate-45 w-full" : "w-full"}`}
      />
      <span
        className={`block h-0.5 bg-ink rounded-full transition-all duration-300 ease-in-out
          ${open ? "opacity-0 -translate-x-2" : "w-4/5 opacity-100"}`}
      />
      <span
        className={`block h-0.5 bg-ink rounded-full origin-left transition-all duration-300 ease-in-out
          ${open ? "-rotate-45 w-full" : "w-3/5"}`}
      />
    </div>
  );
}

// Floating mobile menu
interface MobileMenuProps {
  open: boolean;
  items: NavItem[];
  authStatus: boolean;
  onNavigate: (slug: string) => void;
  onClose: () => void;
}

function MobileMenu({
  open,
  items,
  authStatus,
  onNavigate,
  onClose,
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay so the open-click itself doesn't immediately close
    const id = setTimeout(
      () => document.addEventListener("mousedown", handler),
      10,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeItems = items.filter((i) => i.active);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      />

      {/* Floating card */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed z-50 top-20 right-4 w-64 rounded-2xl border border-edge bg-card shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${
            open
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-90 -translate-y-4 pointer-events-none"
          }`}
      >
        {/* Arrow pointing up to hamburger */}
        <div
          className={`absolute -top-2 right-5 w-4 h-4 rotate-45 border-l border-t border-edge bg-card
            transition-all duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />

        <div className="p-3 pt-4">
          {activeItems.map((item, i) => (
            <button
              key={item.name}
              onClick={() => onNavigate(item.slug)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-ink
                transition-all duration-150 hover:bg-subtle active:scale-[0.98]
                flex items-center justify-between group`}
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
            >
              <span>{item.name}</span>
              <span className="opacity-0 group-hover:opacity-40 transition-opacity text-xs">
                →
              </span>
            </button>
          ))}

          {authStatus && (
            <>
              <div className="my-2 border-t border-edge" />
              <div className="px-1">
                <LogoutBtn />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Header
export default function Header() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const authStatus = useAppSelector((state) => state.auth.status);
  const userData = useAppSelector((state) => state.auth.userData);
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Check admin status whenever user logs in
  useEffect(() => {
    if (!userData) {
      setIsAdmin(false);
      return;
    }
    import("@/lib/appwrite/appwriteService").then(({ default: svc }) => {
      svc.isAdmin(userData.$id).then(setIsAdmin);
    });
  }, [userData]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  const navItems: NavItem[] = [
    { name: "Home", slug: "/", active: true },
    { name: "Login", slug: "/login", active: !authStatus },
    { name: "Signup", slug: "/signup", active: !authStatus },
    { name: "All Posts", slug: "/all-posts", active: authStatus },
    { name: "Add Post", slug: "/add-post", active: authStatus },
    { name: "Admin", slug: "/admin", active: authStatus && isAdmin },
  ];

  const handleNavigate = (slug: string): void => {
    router.push(slug);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-base/85 border-b border-edge">
      <Container>
        <nav className="flex items-center h-14">
          <Link href="/" className="mr-8 flex-shrink-0 flex items-center gap-2">
            <Logo />
            {isAdmin && (
              <span
                className="text-[10px] font-medium tracking-widest uppercase px-2 py-0.5
                rounded-full border border-edge text-muted hidden sm:inline-block"
              >
                Admin
              </span>
            )}
          </Link>

          {isMobile ? (
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />

              {/* Hamburger button */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="p-2 rounded-lg transition-colors hover:bg-subtle"
              >
                <HamburgerIcon open={mobileMenuOpen} />
              </button>

              {/* Floating animated menu */}
              <MobileMenu
                open={mobileMenuOpen}
                items={navItems}
                authStatus={authStatus}
                onNavigate={handleNavigate}
                onClose={() => setMobileMenuOpen(false)}
              />
            </div>
          ) : (
            <ul className="flex ml-auto items-center gap-1">
              {navItems
                .filter((i) => i.active)
                .map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => router.push(item.slug)}
                      className="px-4 py-1.5 text-sm rounded-full text-muted transition-colors hover:text-ink"
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
