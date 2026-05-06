import type { Metadata } from "next";

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
    <div className="font-mono" style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
      {children}
    </div>
  );
}
