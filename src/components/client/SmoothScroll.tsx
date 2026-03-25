'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Uses GSAP to animate page elements on route change.
 * Loaded dynamically so GSAP is never included in the server bundle.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;

    import('gsap').then(({ gsap }) => {
      // Scroll to top instantly on route change
      window.scrollTo(0, 0);

      // Double rAF ensures the DOM has painted the new page elements
      // before GSAP queries for '.gsap-fade-up', preventing the
      // "GSAP target not found" warning on every route change.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ctx = gsap.context(() => {
            gsap.to('.gsap-fade-up', {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform',
            });
          });
        });
      });
    });

    return () => ctx?.revert();
  }, [pathname]);

  return null;
}
