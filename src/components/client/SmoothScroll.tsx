'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scrolls to top on route change and runs GSAP fade-up animations on
 * elements with the .gsap-fade-up class.
 *
 * A short setTimeout is more reliable than rAF in the App Router
 * because client components can stream in after the initial paint.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    import('gsap').then(({ gsap }) => {
      // Effect may have cleaned up before the dynamic import resolved
      if (cancelled) return;

      window.scrollTo(0, 0);

      timer = setTimeout(() => {
        if (cancelled) return;

        const targets = gsap.utils.toArray<HTMLElement>('.gsap-fade-up');
        if (targets.length === 0) return;

        ctx = gsap.context(() => {
          gsap.fromTo(
            targets,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform',
            }
          );
        });
      }, 50);
    });

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      ctx?.revert();
    };
  }, [pathname]);

  return null;
}
