import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gsap-fade-up">
      <span className="text-8xl mb-6 font-display opacity-10">404</span>
      <h1 className="text-3xl mb-3 font-display">Page not found.</h1>
      <p className="text-sm mb-8 text-muted">
        The page you're looking for doesn't exist or was moved.
      </p>
      <Link
        href="/"
        className="text-sm underline underline-offset-4 text-ink transition-opacity hover:opacity-50"
      >
        &larr; Back to home
      </Link>
    </div>
  );
}
