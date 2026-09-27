'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAdminProductDetailAction } from '@/actions/admin-center';
import { useAdminRole } from '@/components/admin/AdminShell';

function Badge({ kind, children }: { kind: string; children: React.ReactNode }) {
  const tone = kind === 'approved' ? 'bg-emerald-100 text-emerald-900'
    : kind === 'blocked' ? 'bg-rose-100 text-rose-900'
    : kind === 'public' ? 'bg-sky-100 text-sky-900'
    : kind === 'source' ? 'bg-stone-100 text-stone-800'
    : 'bg-amber-100 text-amber-900';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{children}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4 sm:p-5 space-y-3">
      <h2 className="font-serif text-lg">{title}</h2>
      {children}
    </section>
  );
}

export default function ProductAdminDetail({ slug }: { slug: string }) {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [product, setProduct] = useState<any>(null);

  async function load() {
    setState('loading');
    const result = await getAdminProductDetailAction(role, slug);
    if (!result.success) {
      setError('error' in result ? result.error : 'Product administration is unavailable.');
      setState('error');
      return;
    }
    setProduct(result.product);
    setState('ready');
  }

  useEffect(() => { load(); }, [role, slug]);

  if (state === 'loading') return <p className="text-sm text-[#5C5852]">Loading product administration…</p>;
  if (state === 'error' || !product) {
    return (
      <div className="rounded-xl border border-[#E5E3DD] bg-white p-5">
        <p className="text-sm">{error}</p>
        <button type="button" onClick={load} className="mt-3 text-sm underline">Retry</button>
      </div>
    );
  }

  const publicationBlocked = product.publication.governance === 'DO_NOT_PUBLISH';
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#5C5852]">
        <Badge kind="source">Source data</Badge>{' '}
        <Badge kind="unresolved">Unresolved</Badge>{' '}
        <Badge kind="approved">Human-approved</Badge>{' '}
        <Badge kind="blocked">Blocked</Badge>{' '}
        <Badge kind="public">Public</Badge>
      </p>
      <Section title="Identity">
        <p className="font-semibold">{product.identity.name}</p>
        <p className="text-sm text-[#5C5852]">{product.identity.brand} · {product.identity.category} · {product.slug}</p>
        <p className="text-sm">SKU <Badge kind={product.identity.sku ? 'source' : 'unresolved'}>{product.identity.sku || 'Unresolved'}</Badge></p>
        <p className="text-sm">Import status <Badge kind="source">{product.identity.importStatus || 'Unknown'}</Badge> is source catalogue data, separate from the publication decision.</p>
      </Section>
      <Section title="Source provenance">
        <p className="text-sm">{product.provenance.sourceCount} source records · {(product.provenance.repositories || []).join(', ') || 'No repository list on the catalogue record'}</p>
      </Section>
      <Section title="Media">
        <p className="text-sm">Governance <Badge kind={product.media.governance === 'MEDIA_REVIEW' ? 'blocked' : 'source'}>{product.media.governance}</Badge></p>
        {product.media.primary ? <img src={product.media.primary} alt="" className="h-24 w-24 rounded-lg object-cover border border-[#E5E3DD]" /> : <p className="text-sm">No primary image is recorded.</p>}
      </Section>
      <Section title="Pricing">
        <p className="text-sm">Catalogue price field <Badge kind="source">{product.pricing.cataloguePriceEUR == null ? 'Empty' : product.pricing.cataloguePriceEUR}</Badge></p>
        <p className="text-sm">Commercial decision <Badge kind="unresolved">{product.pricing.governance}</Badge></p>
        <p className="text-sm">Approved commercial price <Badge kind="unresolved">{product.pricing.approvedCommercialPrice == null ? 'Not decided' : product.pricing.approvedCommercialPrice}</Badge></p>
      </Section>
      <Section title="Compliance">
        <p className="text-sm">Catalogue classification <Badge kind="source">{product.compliance.catalogueClassification}</Badge></p>
        <p className="text-sm">Governance <Badge kind={product.compliance.governance === 'REQUIRES_REVIEW' ? 'unresolved' : 'source'}>{product.compliance.governance}</Badge></p>
      </Section>
      <Section title="Countries">
        <p className="text-sm">Governance <Badge kind="unresolved">{product.countries.governance}</Badge></p>
        <p className="text-xs text-[#5C5852]">Country eligibility is not inferred from shipping hubs or source websites.</p>
      </Section>
      <Section title="Content">
        <p className="text-sm">Disposition <Badge kind={product.content.governance === 'INTERNAL_SOURCE_ONLY' ? 'source' : 'unresolved'}>{product.content.governance}</Badge></p>
        <p className="text-sm whitespace-pre-wrap text-[#5C5852]">{product.content.sourceDescription || 'No source description is stored.'}</p>
        <p className="text-sm">Approved public content <Badge kind="public">{product.content.approvedPublicContent || 'None approved'}</Badge></p>
      </Section>
      <Section title="Translations">
        <p className="text-sm">Workflow <Badge kind="unresolved">{product.translations.governance}</Badge></p>
        <p className="text-sm">{product.translations.locales.join(', ')} remain pending until a person writes each locale.</p>
      </Section>
      <Section title="Publication">
        <p className="text-sm">Decision <Badge kind={publicationBlocked ? 'blocked' : 'unresolved'}>{product.publication.governance}</Badge></p>
        <p className="text-sm">Live publication <Badge kind="blocked">{product.publication.published ? 'Published' : 'Not published'}</Badge></p>
        <ul className="text-sm space-y-1">
          <li>Pricing {product.pricing.governance}</li>
          <li>Compliance {product.compliance.governance}</li>
          <li>Country {product.countries.governance}</li>
          <li>Content {product.content.governance}</li>
          <li>Media {product.media.governance}</li>
          <li>Translation {product.translations.governance}</li>
        </ul>
        <Link className="text-sm underline" href={`/${locale}/admin/catalogue/review-workspace/specialist-review`}>Open specialist review</Link>
      </Section>
      <Section title="Audit">
        {product.audit.length === 0 ? <p className="text-sm text-[#5C5852]">No saved decisions are recorded for this product.</p> : (
          <ul className="text-xs space-y-2">
            {product.audit.map((entry: any) => (
              <li key={entry.id}>{entry.timestamp} · {entry.actor} · {entry.role} · {entry.action} · {entry.field} · {entry.decision}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
