'use client';

import { useEffect } from 'react';

/** Progressive enhancement: content stays visible without JavaScript. */
export default function LandingReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = document.querySelectorAll<HTMLElement>('[data-ac-reveal]');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('ac-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}
