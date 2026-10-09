import type { ReactNode } from 'react';

export default function QuickAnswer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section id="answer" aria-label="Quick Answer" className={className}>
      <p className="text-sm sm:text-base text-[#121212] leading-relaxed">
        <strong>Quick Answer: </strong>
        {children}
      </p>
    </section>
  );
}
