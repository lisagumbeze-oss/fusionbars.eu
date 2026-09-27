'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function scrollWindowToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    scrollWindowToTop();
  }, [pathname]);

  useEffect(() => {
    scrollWindowToTop();
    const frame = window.requestAnimationFrame(scrollWindowToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
