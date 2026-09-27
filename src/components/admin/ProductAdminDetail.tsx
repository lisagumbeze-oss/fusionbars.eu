'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getAdminProductDetailAction, publishProductAction, saveAdminProductCommercialAction, unpublishProductAction } from '@/actions/admin-center';
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
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [confirming, setConfirming] = useState<'publish' | 'unpublish' | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [canEditCommercial, setCanEditCommercial] = useState(false);
  const [canEditPrice, setCanEditPrice] = useState(false);

  async function load() {
    setState('loading');
    const result = await getAdminProductDetailAction(role, slug);
    if (!result.success) {
      setError('error' in result ? result.error : 'Product administration is unavailable.');
      setState('error');
      return;
    }
    setProduct(result.product);
    setCanPublish(Boolean(result.canPublish));
    setCanEditCommercial(Boolean(result.canEditCommercial));
    setCanEditPrice(Boolean(result.canEditPrice));
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

  const checklist = product.publication.checklist;
  const ready = checklist?.readiness === 'READY_FOR_PUBLICATION';
  const prohibited = checklist?.readiness === 'DO_NOT_PUBLISH';
  const published = checklist?.publicationStatus === 'PUBLISHED';

  async function confirmAction() {
    setActionError('');
    setActionMessage('');
    const result = confirming === 'unpublish'
      ? await unpublishProductAction(role, slug, true)
      : await publishProductAction(role, slug, true);
    if (!result.success) {
      setActionError('error' in result ? result.error : 'Publication blocked.');
      setConfirming(null);
      await load();
      return;
    }
    setActionMessage(confirming === 'unpublish' ? 'Removed from the public storefront.' : 'Published to the public storefront.');
    setConfirming(null);
    await load();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#5C5852]">
        <Badge kind="source">Source data</Badge>{' '}
        <Badge kind="unresolved">Unresolved</Badge>{' '}
        <Badge kind="approved">Human-approved</Badge>{' '}
        <Badge kind="blocked">Blocked</Badge>{' '}
        <Badge kind="public">Public</Badge>
      </p>
      {canEditCommercial && (
        <Section title="Storefront edits">
          <form
            key={`${product.identity.name}-${product.identity.headline}-${product.pricing.cataloguePriceEUR}`}
            className="grid gap-3 text-sm"
            onSubmit={async (event) => {
              event.preventDefault();
              setActionError('');
              setActionMessage('');
              const data = new FormData(event.currentTarget);
              const result = await saveAdminProductCommercialAction(role, slug, {
                name: String(data.get('name') || ''),
                headline: String(data.get('headline') || ''),
                description: String(data.get('description') || ''),
                priceEuros: Number(data.get('priceEuros')),
              });
              if (!result.success) {
                setActionError('error' in result ? result.error : 'Product could not be saved.');
                return;
              }
              setActionMessage('Product copy and price saved. The shop and checkout use these values.');
              router.refresh();
              await load();
            }}
          >
            <label>Name
              <input name="name" required minLength={2} maxLength={160} defaultValue={product.identity.name} className="mt-1 w-full rounded-lg border border-[#E5E3DD] px-3 py-2" />
            </label>
            <label>Headline
              <input name="headline" maxLength={220} defaultValue={product.identity.headline || ''} className="mt-1 w-full rounded-lg border border-[#E5E3DD] px-3 py-2" />
            </label>
            <label>Description
              <textarea name="description" maxLength={4000} rows={5} defaultValue={product.content.sourceDescription || ''} className="mt-1 w-full rounded-lg border border-[#E5E3DD] px-3 py-2" />
            </label>
            <label>Price (EUR)
              {!canEditPrice && (
                <input type="hidden" name="priceEuros" value={product.pricing.cataloguePriceEUR == null ? '' : (product.pricing.cataloguePriceEUR / 100).toFixed(2)} />
              )}
              <input name={canEditPrice ? 'priceEuros' : 'pricePreview'} type="number" required={canEditPrice} min="0.01" max="10000" step="0.01" disabled={!canEditPrice} defaultValue={product.pricing.cataloguePriceEUR == null ? '' : (product.pricing.cataloguePriceEUR / 100).toFixed(2)} className="mt-1 w-full rounded-lg border border-[#E5E3DD] px-3 py-2 disabled:bg-[#F6F5F2]" />
            </label>
            <button type="submit" className="w-fit rounded-lg bg-[#4A5D4E] text-white px-4 py-2 font-semibold">Save product</button>
          </form>
          {actionError && <p className="text-sm text-rose-800">{actionError}</p>}
          {actionMessage && <p className="text-sm text-emerald-800">{actionMessage}</p>}
        </Section>
      )}
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
      <Section title="Publication readiness">
        <p className="text-sm">Readiness <Badge kind={prohibited ? 'blocked' : ready ? 'approved' : 'unresolved'}>{checklist?.readiness || 'NOT_READY'}</Badge></p>
        <p className="text-sm">Storefront <Badge kind={published ? 'public' : 'blocked'}>{published ? 'PUBLISHED' : checklist?.publicationStatus || 'NOT_PUBLISHED'}</Badge></p>
        <p className="text-xs whitespace-pre-wrap text-[#5C5852]">{checklist?.summary}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-[#8E8B85]">
              <tr>
                <th className="py-2 pr-3">Gate</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Blocking</th>
                <th className="py-2">Responsible</th>
              </tr>
            </thead>
            <tbody>
              {(checklist?.gates || []).map((item: any) => (
                <tr key={item.gate} className="border-t border-[#E5E3DD]">
                  <td className="py-2 pr-3 capitalize">{item.gate}</td>
                  <td className="py-2 pr-3"><Badge kind={item.visual === 'COMPLETE' ? 'approved' : item.visual === 'DO_NOT_PUBLISH' || item.visual === 'REJECTED' || item.visual === 'BLOCKED' ? 'blocked' : 'unresolved'}>{item.visual}</Badge></td>
                  <td className="py-2 pr-3 text-right">{item.blocking ? 'Yes' : 'No'}</td>
                  <td className="py-2">{item.responsibleRole}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canPublish && !published && (
          <button
            type="button"
            disabled={!ready || prohibited}
            onClick={() => { setActionError(''); setConfirming('publish'); }}
            className="rounded-lg bg-[#121212] text-white px-3 py-2 text-sm disabled:opacity-40"
          >
            Publish Product
          </button>
        )}
        {canPublish && published && (
          <button type="button" onClick={() => { setActionError(''); setConfirming('unpublish'); }} className="rounded-lg border border-[#121212] px-3 py-2 text-sm">
            Unpublish Product
          </button>
        )}
        {actionError && <p className="text-sm text-rose-800">{actionError}</p>}
        {actionMessage && <p className="text-sm text-emerald-800">{actionMessage}</p>}
        <Link className="text-sm underline" href={`/${locale}/admin/catalogue/publication`}>Open publication dashboard</Link>
        <Link className="text-sm underline block" href={`/${locale}/admin/catalogue/review-workspace/specialist-review`}>Open specialist review</Link>
      </Section>
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="max-w-lg rounded-2xl bg-white p-5 space-y-3">
            {confirming === 'publish' ? (
              <p className="text-sm">Publish this product to the public storefront? The product has passed all required publication gates. Once published, it may become visible in storefront search, category pages, product pages and other public surfaces.</p>
            ) : (
              <p className="text-sm">Unpublish this product? It will leave public search, categories, and product pages. The catalogue record, source provenance, and historical decisions stay in place.</p>
            )}
            <div className="flex gap-2">
              <button type="button" className="rounded-lg bg-[#121212] text-white px-3 py-2 text-sm" onClick={confirmAction}>
                {confirming === 'publish' ? 'Publish Product' : 'Unpublish Product'}
              </button>
              <button type="button" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" onClick={() => setConfirming(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
