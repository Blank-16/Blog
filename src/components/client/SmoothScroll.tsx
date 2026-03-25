'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A short setTimeout is more reliable than rAF in the App Router
 * because client components can stream in after paint.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout>;

    import('gsap').then(({ gsap }) => {
      window.scrollTo(0, 0);

      timer = setTimeout(() => {
        const targets = gsap.utils.toArray<HTMLElement>('.gsap-fade-up');
        if (targets.length === 0) return; // nothing to animate — no warning

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
      }, 50); // 50 ms is enough for streamed client components to mount
    });

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, [pathname]);

  return null;
}
