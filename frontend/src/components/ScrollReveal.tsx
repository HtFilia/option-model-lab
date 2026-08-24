import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';

interface ScrollRevealProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function ScrollReveal({ children, className = '', ...props }: ScrollRevealProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window),
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      className={`scroll-reveal ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
}
