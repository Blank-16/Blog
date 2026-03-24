import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gsap-fade-up">
      <span className="text-8xl mb-6" style={{ fontFamily: 'var(--font-display)', opacity: 0.12 }}>404</span>
      <h1 className="text-3xl mb-3" style={{ fontFamily: 'var(--font-display)' }}>Page not found.</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="text-sm underline underline-offset-4 transition-opacity hover:opacity-50"
        style={{ color: 'var(--text)' }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
