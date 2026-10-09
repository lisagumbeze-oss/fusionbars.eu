import Link from 'next/link';
import { SHOP_DESK } from '@/domain/content/public-trust';

export default function AuthorBio({ locale }: { locale: string }) {
  return (
    <section id="author" aria-label="Author" className="rounded-2xl border border-[#E5E3DD] bg-white p-6">
      <h2 className="font-serif text-xl font-bold text-[#121212]">Who wrote this note?</h2>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#4A5D4E]">{SHOP_DESK.role}</p>
      <p className="mt-3 text-sm text-[#5C5852] leading-relaxed">{SHOP_DESK.bio}</p>
      <p className="mt-3 text-sm">
        <Link href={`/${locale}${SHOP_DESK.path}`} className="font-semibold text-[#4A5D4E] hover:underline">
          {SHOP_DESK.name}
        </Link>
      </p>
    </section>
  );
}
