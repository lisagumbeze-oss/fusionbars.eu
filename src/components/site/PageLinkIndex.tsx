import Link from 'next/link';
import { pageLinkIndex, type SiteLink } from '@/lib/page-link-index';

function InternalList({ links }: { links: SiteLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {links.map((link) => (
        <li key={`${link.href}:${link.label}`}>
          <Link href={link.href} className="text-[#4A5D4E] hover:text-[#121212] hover:underline">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PageLinkIndex({ locale, currentPath }: { locale: string; currentPath?: string }) {
  const index = pageLinkIndex(locale, currentPath);

  return (
    <nav aria-label="Pages on this site" className="border-t border-[#E5E3DD] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <section aria-labelledby="link-index-notes">
            <h2 id="link-index-notes" className="font-serif text-lg font-bold text-[#121212]">Shop notes</h2>
            <InternalList links={index.keywords} />
          </section>
          <section aria-labelledby="link-index-store">
            <h2 id="link-index-store" className="font-serif text-lg font-bold text-[#121212]">Store</h2>
            <InternalList links={index.store} />
          </section>
          <section aria-labelledby="link-index-journal">
            <h2 id="link-index-journal" className="font-serif text-lg font-bold text-[#121212]">Journal and products</h2>
            <InternalList links={[...index.journal, ...index.products]} />
          </section>
          <section aria-labelledby="link-index-references">
            <h2 id="link-index-references" className="font-serif text-lg font-bold text-[#121212]">References</h2>
            <p className="mt-3 text-xs text-[#5C5852] leading-relaxed">
              Lab checks, cacao, and EU food labelling, as named on the store.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {index.outbound.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-[#4A5D4E] hover:text-[#121212] hover:underline" rel="noopener noreferrer" target="_blank">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </nav>
  );
}
