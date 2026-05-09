'use client';

import { useEffect } from 'react';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-20">
      <Container>
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-display text-ink">Something went wrong</h2>
            <p className="text-muted text-sm leading-relaxed">
              We encountered an unexpected error. This has been logged and we're looking into it.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={() => reset()} variant="primary">
              Try again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="secondary">
              Go home
            </Button>
          </div>
          {error.digest && (
            <p className="text-[10px] font-mono text-muted opacity-50">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
