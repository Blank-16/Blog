import Link from 'next/link';
import Container from '@/components/Container';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <Container>
        <h1 className="text-5xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-gray-500 mb-8">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </Link>
      </Container>
    </div>
  );
}
