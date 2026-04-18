import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import StoreProvider from "@/store/StoreProvider";
import AuthInitializer from "@/components/client/AuthInitializer";
import Header from "@/components/client/Header";
import Footer from "@/components/ui/Footer";
import SmoothScroll from "@/components/client/SmoothScroll";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export const metadata: Metadata = {
  title: {
    default: "Blogging Web",
    template: "%s – Blogging Web",
  },
  description:
    "A place for writers to share thoughts, stories, and perspectives that matter.",
  metadataBase: new URL(siteUrl || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Blogging Web",
    title: "Blogging Web",
    description:
      "A place for writers to share thoughts, stories, and perspectives that matter.",
  },
  twitter: {
    card: "summary",
    title: "Blogging Web",
    description:
      "A place for writers to share thoughts, stories, and perspectives that matter.",
  },
  icons: { icon: "/logo.svg" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value;
  const theme = themeCookie === 'dark' ? 'dark' : 'light';

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var hasCookie = document.cookie.indexOf('theme=') !== -1;
    if (hasCookie) return;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.cookie = 'theme=dark; path=/; max-age=31536000; SameSite=Lax';
    } else {
      document.cookie = 'theme=light; path=/; max-age=31536000; SameSite=Lax';
    }
  } catch(e) {}
})();`,
          }}
        />
      </head>
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
