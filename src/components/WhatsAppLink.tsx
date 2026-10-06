import React from 'react';

const WHATSAPP_URL = 'https://wa.me/447447412559';

export function whatsAppHref(message?: string): string {
  const text = message?.trim();
  if (!text) return WHATSAPP_URL;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.9 11.9 0 0 0 5.76 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.16-3.45-8.44zM12.07 21.3h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.64-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}

export default function WhatsAppLink({
  variant = 'icon',
  message,
  className = '',
}: {
  variant?: 'icon' | 'button';
  message?: string;
  className?: string;
}) {
  const icon = variant === 'icon';
  return (
    <a
      href={whatsAppHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className={
        icon
          ? `inline-flex items-center justify-center text-[#25D366] transition hover:text-[#128C7E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] ${className}`
          : `inline-flex items-center justify-center gap-2 rounded-lg border border-[#25D366] bg-white px-4 py-3.5 text-xs font-semibold text-[#128C7E] transition hover:bg-[#25D366]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] ${className}`
      }
    >
      <WhatsAppMark className={icon ? 'h-5 w-5' : 'h-4 w-4'} />
      {icon ? null : <span>WhatsApp</span>}
    </a>
  );
}
