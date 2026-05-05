"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import appwriteService from "@/lib/appwrite/appwriteService";
import Logo from "@/components/ui/Logo";
import LogoutBtn from "@/components/client/LogoutBtn";
import ThemeToggle from "@/components/client/ThemeToggle";

// ─── types ───────────────────────────────────────────────────────────────────

interface NavItem {
  name: string;
  slug: string;
  active: boolean;
  icon: React.ReactNode;
}

// ─── icons ───────────────────────────────────────────────────────────────────

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const icons = {
  home:       "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  stories:    "M4 6h16M4 10h16M4 14h10",
  search:     "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  myPosts:    "M9 12h6m-3-3v6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
  addPost:    "M12 5v14M5 12h14",
  admin:      "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
  login:      "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3",
  signup:     "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 7a4 4 0 110 8 4 4 0 010-8zM20 8v6M23 11h-6",
  portfolio:  "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  profile:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z",
};

// ─── mobile hamburger ─────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-5 h-4 flex flex-col justify-between cursor-pointer">
      <span className={`block h-0.5 bg-ink rounded-full origin-left transition-all duration-300
        ${open ? "rotate-45 w-full" : "w-full"}`} />
      <span className={`block h-0.5 bg-ink rounded-full transition-all duration-300
        ${open ? "opacity-0 -translate-x-2" : "w-4/5 opacity-100"}`} />
      <span className={`block h-0.5 bg-ink rounded-full origin-left transition-all duration-300
        ${open ? "-rotate-45 w-full" : "w-3/5"}`} />
    </div>
  );
}

// ─── mobile menu (dropdown card) ─────────────────────────────────────────────

function MobileMenu({
  open, items, authStatus, onNavigate, onClose,
}: {
  open: boolean;
  items: NavItem[];
  authStatus: boolean;
  onNavigate: (slug: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const activeItems = items.filter((i) => i.active);

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300
        ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} aria-hidden />

      <div
        ref={menuRef}
        role="dialog" aria-modal="true" aria-label="Navigation menu"
        className={`fixed z-50 top-20 right-4 w-64 rounded-2xl border border-edge bg-card shadow-2xl
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 -translate-y-4 pointer-events-none"
          }`}
      >
        <div className="absolute -top-2 right-5 w-4 h-4 rotate-45 border-l border-t border-edge bg-card
          transition-all duration-300" aria-hidden />

        <div className="p-3 pt-4">
          {activeItems.map((item, i) => (
            <button
              key={item.name}
              onClick={() => onNavigate(item.slug)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-ink
                transition-all duration-150 hover:bg-subtle active:scale-[0.98]
                flex items-center gap-3 group"
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
            >
              <span className="text-muted group-hover:text-ink transition-colors">{item.icon}</span>
              <span className="flex-1">{item.name}</span>
              <span className="opacity-0 group-hover:opacity-40 transition-opacity text-xs">&rarr;</span>
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

// ─── desktop sidebar ──────────────────────────────────────────────────────────

function Sidebar({
  items, authStatus, pathname, isAdmin, userName, userEmail,
}: {
  items: NavItem[];
  authStatus: boolean;
  pathname: string;
  isAdmin: boolean;
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const activeItems = items.filter((i) => i.active);

  // Group nav items
  const main = activeItems.filter((i) =>
    ["Home", "All Stories", "Search", "Portfolio"].includes(i.name)
  );
  const authed = activeItems.filter((i) =>
    ["My Posts", "Add Post", "Admin"].includes(i.name)
  );
  const auth = activeItems.filter((i) =>
    ["Login", "Signup"].includes(i.name)
  );

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? "?";

  function NavBtn({ item }: { item: NavItem }) {
    const active = pathname === item.slug;
    return (
      <button
        onClick={() => router.push(item.slug)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150
          ${active
            ? "bg-subtle text-ink font-medium"
            : "text-muted hover:text-ink hover:bg-subtle/50"
          }`}
      >
        <span className={active ? "text-ink" : "text-muted"}>{item.icon}</span>
        <span>{item.name}</span>
        {item.name === "Admin" && (
          <span className="ml-auto text-[9px] font-medium tracking-widest uppercase
            px-1.5 py-0.5 rounded border border-edge text-muted">
            admin
          </span>
        )}
      </button>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 border-r border-edge
      bg-base/95 backdrop-blur-md z-30 py-5 px-3">

      {/* Logo */}
      <div className="px-3 mb-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          {isAdmin && (
            <span className="text-[9px] font-medium tracking-widest uppercase px-1.5 py-0.5
              rounded-full border border-edge text-muted">
              Admin
            </span>
          )}
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5">
        {main.map((item) => <NavBtn key={item.name} item={item} />)}
      </nav>

      {/* Auth-gated section */}
      {authed.length > 0 && (
        <>
          <div className="my-3 border-t border-edge" />
          <nav className="flex flex-col gap-0.5">
            {authed.map((item) => <NavBtn key={item.name} item={item} />)}
          </nav>
        </>
      )}

      {/* Auth links (logged out) */}
      {auth.length > 0 && (
        <>
          <div className="my-3 border-t border-edge" />
          <nav className="flex flex-col gap-0.5">
            {auth.map((item) => <NavBtn key={item.name} item={item} />)}
          </nav>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: theme + profile */}
      <div className="border-t border-edge pt-3 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-xs text-muted flex-1">Theme</span>
          <ThemeToggle />
        </div>

        {authStatus ? (
          <button
            onClick={() => router.push("/profile")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
              ${pathname === "/profile" ? "bg-subtle text-ink" : "text-muted hover:text-ink hover:bg-subtle/50"}`}
          >
            <div className="w-6 h-6 rounded-full bg-subtle border border-edge flex items-center
              justify-center text-[11px] font-medium text-ink flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-ink truncate">{userName || "Profile"}</p>
              <p className="text-[10px] text-muted truncate">{userEmail}</p>
            </div>
          </button>
        ) : null}

        {authStatus && (
          <div className="px-1">
            <LogoutBtn />
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function Header() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const authStatus = useAppSelector((state) => state.auth.status);
  const userData = useAppSelector((state) => state.auth.userData);
  const router = useRouter();
  const pathname = usePathname();

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 1024);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!userData) { setIsAdmin(false); return; }
    appwriteService.isAdmin(userData.$id).then(setIsAdmin);
  }, [userData]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide header/sidebar entirely on the portfolio route — it has its own nav
  if (pathname.startsWith("/portfolio")) return null;

  const navItems: NavItem[] = [
    { name: "Home",       slug: "/",             active: true,                    icon: <Icon d={icons.home} /> },
    { name: "All Stories",slug: "/public-posts", active: true,                    icon: <Icon d={icons.stories} /> },
    { name: "Search",     slug: "/search",       active: true,                    icon: <Icon d={icons.search} /> },
    { name: "Portfolio",  slug: "/portfolio",    active: true,                    icon: <Icon d={icons.portfolio} /> },
    { name: "Login",      slug: "/login",        active: !authStatus,             icon: <Icon d={icons.login} /> },
    { name: "Signup",     slug: "/signup",       active: !authStatus,             icon: <Icon d={icons.signup} /> },
    { name: "My Posts",   slug: "/all-posts",    active: authStatus,              icon: <Icon d={icons.myPosts} /> },
    { name: "Add Post",   slug: "/add-post",     active: authStatus,              icon: <Icon d={icons.addPost} /> },
    { name: "Admin",      slug: "/admin",        active: authStatus && isAdmin,   icon: <Icon d={icons.admin} /> },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <Sidebar
        items={navItems}
        authStatus={authStatus}
        pathname={pathname}
        isAdmin={isAdmin}
        userName={userData?.name ?? ""}
        userEmail={userData?.email ?? ""}
      />

      {/* Mobile top bar */}
      {isMobile && (
        <header className="sticky top-0 z-30 backdrop-blur-md bg-base/85 border-b border-edge lg:hidden">
          <div className="px-4">
            <nav className="flex items-center h-14 gap-3">
              <Link href="/" className="flex items-center gap-2 mr-auto">
                <Logo priority />
                {isAdmin && (
                  <span className="text-[10px] font-medium tracking-widest uppercase px-2 py-0.5
                    rounded-full border border-edge text-muted">
                    Admin
                  </span>
                )}
              </Link>
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="p-2 rounded-lg transition-colors hover:bg-subtle"
              >
                <HamburgerIcon open={mobileMenuOpen} />
              </button>
              <MobileMenu
                open={mobileMenuOpen}
                items={navItems}
                authStatus={authStatus}
                onNavigate={(slug) => { router.push(slug); setMobileMenuOpen(false); }}
                onClose={() => setMobileMenuOpen(false)}
              />
            </nav>
          </div>
        </header>
      )}
    </>
  );
}
