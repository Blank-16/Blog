import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ansuman Pal — Portfolio",
  description:
    "Full-Stack Developer and Systems Programmer specialising in TypeScript, Java, and Python.",
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${mono.variable} font-mono`} style={{ fontFamily: "var(--font-mono), monospace" }}>
      {children}
    </div>
  );
}
