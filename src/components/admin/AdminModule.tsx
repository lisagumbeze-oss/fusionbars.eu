'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  getAdminAuditAction,
  getAdminCustomersAction,
  getAdminDashboardAction,
  getAdminPaymentsAction,
  getAdminProductListAction,
  getAdminPromotionsAction,
  getAdminSettingsAction,
  getEmailDeliveryLogAction,
  getEmailTemplateCenterAction,
  markAdminNotificationReadAction,
  markAllAdminNotificationsReadAction,
  previewEmailTemplateAction,
} from '@/actions/admin-center';
import { updateOrderStatusAdminAction } from '@/actions/orders';
import { verifyPaymentStatusAction } from '@/actions/payments';
import { sendTestEmailAction } from '@/actions/launch';
import { AdminAccess } from '@/domain/admin/AdminAccess';
import { useAdminRole } from '@/components/admin/AdminShell';
import { RoleName } from '@/types';

type ModuleId =
  | 'payments'
  | 'customers'
  | 'promotions'
  | 'products'
  | 'catalogue'
  | 'media'
  | 'translations'
  | 'compliance'
  | 'countries'
  | 'content'
  | 'audit'
  | 'notifications'
  | 'email-templates'
  | 'email-delivery'
  | 'settings'
  | 'roles'
  | 'sales'
  | 'catalogue-report'
  | 'operations';

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4 sm:p-5">
      {title && <h2 className="font-serif text-lg mb-3">{title}</h2>}
      {children}
    </section>
  );
}

function StateMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Panel>
      <p className="text-sm text-[#5C5852]">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-[#4A5D4E] underline">Retry</button>}
    </Panel>
  );
}

export default function AdminModule({ module }: { module: ModuleId }) {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const search = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<any>(null);
  const [query, setQuery] = useState(search.get('q') || '');
  const [preview, setPreview] = useState<any>(null);
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [confirm, setConfirm] = useState<null | { title: string; run: () => Promise<void> }>(null);
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      let result: any;
      if (module === 'payments') result = await getAdminPaymentsAction(role);
      else if (module === 'customers') result = await getAdminCustomersAction(role);
      else if (module === 'promotions') result = await getAdminPromotionsAction(role);
      else if (module === 'products') result = await getAdminProductListAction(role, search.get('q') || '');
      else if (module === 'audit') result = await getAdminAuditAction(role);
      else if (module === 'notifications') result = await getAdminDashboardAction(role, locale);
      else if (module === 'email-templates') result = await getEmailTemplateCenterAction(role);
      else if (module === 'email-delivery') result = await getEmailDeliveryLogAction(role);
      else if (module === 'settings') result = await getAdminSettingsAction(role);
      else if (['catalogue', 'media', 'translations', 'compliance', 'countries', 'content', 'sales', 'catalogue-report', 'operations'].includes(module)) {
        result = await getAdminDashboardAction(role, locale);
      } else if (module === 'roles') {
        result = { success: true };
      }
      if (result && result.success === false) {
        setError(result.error || 'This section is unavailable.');
        setPayload(null);
      } else {
        setPayload(result);
      }
    } catch (err: any) {
      setError(err.message || 'This section is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [role, module, search]);

  const catalogue = payload?.catalogue || payload?.success && payload.catalogue;

  const filteredNotifications = useMemo(() => {
    const items = payload?.notifications || [];
    const category = search.get('category') || 'ALL';
    const unread = search.get('unread') === '1';
    const q = (search.get('q') || '').toLowerCase();
    return items.filter((item: any) => {
      if (category !== 'ALL' && item.category !== category) return false;
      if (unread && item.read) return false;
      if (q && !`${item.title} ${item.entityId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payload, search]);

  if (loading) return <p className="text-sm text-[#5C5852]">Loading…</p>;
  if (error) return <StateMessage message={error} onRetry={load} />;

  if (module === 'roles') {
    const roles: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER', 'CUSTOMER'];
    return (
      <Panel title="Visible sections">
        <p className="text-xs text-[#5C5852] mb-4">This matrix describes navigation. It does not grant a permission the server withholds.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-[#5C5852]"><th className="py-2 pr-4">Role</th><th className="py-2">Sections</th></tr></thead>
            <tbody>
              {roles.map((item) => (
                <tr key={item} className="border-t border-[#E5E3DD]">
                  <td className="py-2 pr-4 font-semibold whitespace-nowrap">{item}</td>
                  <td className="py-2">{AdminAccess.sections(item).join(', ') || 'No admin sections'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }

  if (module === 'settings' && payload?.settings) {
    const settings = payload.settings;
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Store">
          <dl className="text-sm space-y-2">
            <div><dt className="text-[#5C5852]">Display name</dt><dd>{settings.storeName}</dd></div>
            <div><dt className="text-[#5C5852]">Support email</dt><dd>{settings.supportEmail}</dd></div>
            <div><dt className="text-[#5C5852]">Currencies</dt><dd>{settings.currencies.join(', ')}</dd></div>
            <div><dt className="text-[#5C5852]">Languages</dt><dd>{settings.languages.join(', ')}</dd></div>
          </dl>
        </Panel>
        <Panel title="Shipping">
          <dl className="text-sm space-y-2">
            <div><dt className="text-[#5C5852]">Standard</dt><dd>€{(settings.shipping.standardCents / 100).toFixed(2)}</dd></div>
            <div><dt className="text-[#5C5852]">Express</dt><dd>€{(settings.shipping.expressCents / 100).toFixed(2)}</dd></div>
            <div><dt className="text-[#5C5852]">Free-shipping threshold</dt><dd>€{(settings.shipping.freeThresholdCents / 100).toFixed(2)}</dd></div>
            <div><dt className="text-[#5C5852]">Fulfilment hubs</dt><dd>{settings.shipping.hubs.join(', ')}</dd></div>
          </dl>
        </Panel>
        <Panel title="Payments">
          <p className="text-sm">Bank transfer configuration: {settings.payments.bankConfigured ? 'Configured' : 'Not configured'}</p>
          <p className="text-sm">Crypto configuration: {settings.payments.cryptoConfigured ? 'Configured' : 'Not configured'}</p>
          <p className="text-xs text-[#5C5852] mt-2">Account numbers, wallet addresses, and secrets are not shown.</p>
          <p className="text-sm mt-2">Public methods: {settings.payments.publicMethods.join(', ') || 'None active'}</p>
        </Panel>
        <Panel title="Email">
          <p className="text-sm">Provider: {settings.email.provider}</p>
          <p className="text-sm">Sender: {settings.email.sender}</p>
          <p className="text-sm">Provider key: {settings.email.keyConfigured ? 'Present' : 'Missing'}</p>
        </Panel>
        <Panel title="Security">
          <p className="text-sm">Session secret: {settings.security.sessionSecretConfigured ? 'Present' : 'Using development fallback'}</p>
          <p className="text-sm">Auth secret: {settings.security.authSecretConfigured ? 'Present' : 'Using development fallback'}</p>
          <p className="text-sm">Rate limit: {settings.security.distributedRateLimit ? 'Distributed' : 'Local'}</p>
          <p className="text-sm mt-2">Production: {payload.productionState}</p>
        </Panel>
      </div>
    );
  }

  if (module === 'email-templates') {
    return (
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <Panel title="Templates">
          <ul className="space-y-2">
            {(payload?.templates || []).map((template: any) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="w-full text-left text-sm rounded-lg border border-[#E5E3DD] px-3 py-2 hover:border-[#4A5D4E]"
                  onClick={async () => {
                    const result = await previewEmailTemplateAction(role, template.id);
                    if (!result.success) setNotice('error' in result ? result.error : 'Preview unavailable.');
                    else setPreview(result.preview);
                  }}
                >
                  <span className="block font-semibold">{template.name}</span>
                  <span className="text-[11px] text-[#5C5852]">{template.audience === 'ADMIN' ? 'ADMIN / INTERNAL EMAIL' : 'CUSTOMER EMAIL'}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={preview?.name || 'Preview'}>
          {!preview ? <p className="text-sm text-[#5C5852]">Select a template. Opening this page does not send email.</p> : (
            <div className="space-y-3 text-sm">
              <p><span className="text-[#5C5852]">Audience. </span>{preview.audience === 'ADMIN' ? 'ADMIN / INTERNAL EMAIL' : 'CUSTOMER EMAIL'}</p>
              <p><span className="text-[#5C5852]">Purpose. </span>{preview.purpose}</p>
              <p><span className="text-[#5C5852]">Trigger. </span>{preview.trigger}</p>
              <p><span className="text-[#5C5852]">Recipient. </span>{preview.recipient}</p>
              <p><span className="text-[#5C5852]">Subject. </span>{preview.subject}</p>
              <p><span className="text-[#5C5852]">Variables. </span>{preview.variables.join(', ')}</p>
              <p><span className="text-[#5C5852]">State. </span>{preview.active ? 'Active' : 'Inactive'} · {preview.lastUpdated}</p>
              <div className="flex gap-2">
                <button type="button" className="text-xs rounded-lg border px-2 py-1" onClick={() => setPreviewWidth('desktop')}>Desktop preview</button>
                <button type="button" className="text-xs rounded-lg border px-2 py-1" onClick={() => setPreviewWidth('mobile')}>Mobile preview</button>
              </div>
              <iframe title="Email preview" sandbox="" srcDoc={preview.html} className={`border border-[#E5E3DD] rounded-lg bg-white h-80 ${previewWidth === 'mobile' ? 'w-[375px] max-w-full' : 'w-full'}`} />
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!payload?.canModify) {
                    setNotice('This role cannot send a test message.');
                    return;
                  }
                  const form = new FormData(event.currentTarget);
                  const result = await sendTestEmailAction({ recipientEmail: String(form.get('recipient') || '') });
                  setNotice(result.success ? (result.message || 'Test probe queued.') : (result.error || 'Test send was not accepted.'));
                }}
              >
                <input name="recipient" type="email" required placeholder="Test recipient" className="flex-1 rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
                <button type="submit" disabled={!payload?.canModify} className="rounded-lg bg-[#4A5D4E] text-white px-3 py-2 text-sm disabled:opacity-40">Send test</button>
              </form>
              {!payload?.canModify && <p className="text-xs text-[#5C5852]">Template changes and test sends are disabled for this role.</p>}
              {notice && <p className="text-sm">{notice}</p>}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  if (module === 'email-delivery') {
    const status = search.get('status') || 'ALL';
    const entries = (payload?.entries || []).filter((entry: any) => status === 'ALL' || entry.status === status);
    return (
      <Panel>
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {['ALL', 'success', 'pending', 'failed', 'bounced'].map((item) => (
            <button key={item} type="button" className="rounded-lg border border-[#E5E3DD] px-2 py-1" onClick={() => router.push(`?status=${item}`)}>{item}</button>
          ))}
        </div>
        {entries.length === 0 ? <p className="text-sm text-[#5C5852]">No email delivery records match this filter.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[#5C5852]"><th className="py-2">Message</th><th>Template</th><th>Recipient</th><th>Provider</th><th>Status</th><th>Sent</th><th>Failure</th></tr></thead>
              <tbody>
                {entries.map((entry: any) => (
                  <tr key={entry.messageId} className="border-t border-[#E5E3DD]">
                    <td className="py-2 font-mono">{entry.messageId}</td>
                    <td>{entry.template}</td>
                    <td>{entry.recipient}</td>
                    <td>{entry.provider}</td>
                    <td>{entry.deliveryStatus}</td>
                    <td>{entry.sentAt || '—'}</td>
                    <td>{entry.failureReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    );
  }

  if (module === 'notifications') {
    return (
      <Panel>
        <form className="flex flex-col sm:flex-row gap-2 mb-4" onSubmit={(event) => { event.preventDefault(); router.push(`?q=${encodeURIComponent(query)}&category=${search.get('category') || 'ALL'}`); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications" className="flex-1 rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
          <select defaultValue={search.get('category') || 'ALL'} onChange={(event) => router.push(`?category=${event.target.value}&q=${encodeURIComponent(query)}`)} className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm">
            {['ALL', 'Orders', 'Payments', 'Catalogue', 'Compliance', 'Inventory', 'System', 'Security'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={async () => { await markAllAdminNotificationsReadAction(role, filteredNotifications.map((item: any) => item.id)); load(); }}>Mark all as read</button>
        </form>
        {filteredNotifications.length === 0 ? <p className="text-sm text-[#5C5852]">No notifications match this filter.</p> : (
          <ul className="space-y-2">
            {filteredNotifications.map((item: any) => (
              <li key={item.id} className="rounded-xl border border-[#E5E3DD] p-3 text-sm flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-[#5C5852]">{item.category} · {item.severity} · {item.entityType} {item.entityId} · {item.read ? 'Read' : 'Unread'}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={item.href} className="text-xs font-semibold underline">Open</Link>
                  {!item.read && <button type="button" className="text-xs font-semibold underline" onClick={async () => { await markAdminNotificationReadAction(role, item.id); load(); }}>Mark as read</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (module === 'payments') {
    const status = search.get('status');
    const method = search.get('method');
    const rows = (payload?.payments || []).filter((row: any) => {
      if (status && row.status !== status) return false;
      if (method === 'bank' && !String(row.method).includes('SEPA') && !String(row.method).includes('BANK')) return false;
      if (method === 'crypto' && !String(row.method).includes('CRYPTO')) return false;
      return true;
    });
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link className="rounded-lg border px-2 py-1" href={`/${locale}/admin/payments`}>All awaiting review</Link>
          <Link className="rounded-lg border px-2 py-1" href={`/${locale}/admin/payments?method=bank`}>Bank transfer</Link>
          <Link className="rounded-lg border px-2 py-1" href={`/${locale}/admin/payments?method=crypto`}>Crypto</Link>
        </div>
        {rows.length === 0 ? <StateMessage message="No payments currently require verification." /> : (
          <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="text-[#5C5852]"><tr><th className="p-3">Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Submitted</th><th>Evidence</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} className="border-t border-[#E5E3DD] align-top">
                    <td className="p-3 font-mono">{row.orderNumber}</td>
                    <td className="p-3">{row.customer}</td>
                    <td className="p-3">{row.currency} {(row.amount / 100).toFixed(2)}</td>
                    <td className="p-3">{row.method}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">{row.updatedAt || row.createdAt}</td>
                    <td className="p-3">{row.proof ? <a className="underline" href={row.proof}>View evidence</a> : row.reference || 'No evidence file is attached.'}</td>
                    <td className="p-3 space-y-1">
                      <button type="button" disabled={!payload?.canVerify} className="block text-left underline disabled:opacity-40" onClick={() => setConfirm({ title: `Verify ${row.orderNumber}? This records an auditable payment decision.`, run: async () => { const res = await verifyPaymentStatusAction({ orderId: row.id, targetStatus: 'PAYMENT_VERIFIED', actorRole: role, actorId: 'admin-finance-desk' }); setNotice(res.success ? res.message || 'Verified' : res.error || 'Verification was not applied.'); } })}>Verify</button>
                      <button type="button" disabled={!payload?.canVerify} className="block text-left underline disabled:opacity-40" onClick={() => setConfirm({ title: `Reject ${row.orderNumber}? The order moves to CANCELLED and the action is audited.`, run: async () => { const res = await updateOrderStatusAdminAction({ orderId: row.id, newStatus: 'CANCELLED', actorRole: role, actorId: 'admin-finance-desk', note: 'Payment rejected' }); setNotice(res.success ? 'Payment rejected.' : res.error || 'Rejection was not applied.'); } })}>Reject</button>
                      <button type="button" disabled={!payload?.canVerify} className="block text-left underline disabled:opacity-40" onClick={() => setConfirm({ title: `Request clarification on ${row.orderNumber}? The order returns to PENDING_PAYMENT.`, run: async () => { const res = await updateOrderStatusAdminAction({ orderId: row.id, newStatus: 'PENDING_PAYMENT', actorRole: role, actorId: 'admin-finance-desk', note: 'Clarification requested' }); setNotice(res.success ? 'Clarification requested.' : res.error || 'Request was not applied.'); } })}>Request clarification</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {notice && <p className="text-sm">{notice}</p>}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
              <p className="text-sm">{confirm.title}</p>
              <div className="flex gap-2">
                <button type="button" className="rounded-lg bg-[#4A5D4E] text-white px-3 py-2 text-sm" onClick={async () => { await confirm.run(); setConfirm(null); load(); }}>Confirm</button>
                <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (module === 'customers') {
    const q = (search.get('q') || '').toLowerCase();
    const rows = (payload?.customers || []).filter((row: any) => !q || `${row.email} ${row.name} ${row.country}`.toLowerCase().includes(q));
    return (
      <Panel>
        <form className="mb-4" onSubmit={(event) => { event.preventDefault(); router.push(`?q=${encodeURIComponent(query)}`); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="w-full sm:w-80 rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
        </form>
        {rows.length === 0 ? <p className="text-sm text-[#5C5852]">No customers match this filter.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[#5C5852]"><th className="py-2">Customer</th><th>Email</th><th>Country</th><th>Account</th><th>Orders</th><th>Last order</th><th>Registered</th></tr></thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.email} className="border-t border-[#E5E3DD]">
                    <td className="py-2">{row.name || '—'}</td>
                    <td>{row.email}</td>
                    <td>{row.country}</td>
                    <td>{row.accountStatus}</td>
                    <td>{row.orderCount}</td>
                    <td>{row.lastOrder}</td>
                    <td>{row.registeredAt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    );
  }

  if (module === 'promotions') {
    const coupons = payload?.coupons || [];
    return (
      <div className="space-y-4">
        <Panel title="Pricing boundary">
          <p className="text-sm">Promotions apply at checkout as an order discount. They do not approve, convert, or replace a product price.</p>
          <Link href={`/${locale}/admin/orders`} className="mt-3 inline-block text-sm underline">Open coupon tools in commerce operations</Link>
        </Panel>
        <Panel title="Recorded coupons">
          {coupons.length === 0 ? <p className="text-sm text-[#5C5852]">No coupons are stored in the current operations ledger.</p> : (
            <ul className="text-sm space-y-2">
              {coupons.map((coupon: any) => (
                <li key={coupon.code} className="border-t border-[#E5E3DD] pt-2">{coupon.code} · {coupon.isPercent ? `${coupon.discount}%` : coupon.discount} · {coupon.active ? 'Active' : 'Inactive'} · used {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''} · {coupon.expiresAt || 'No expiry recorded'}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    );
  }

  if (module === 'products') {
    const rows = payload?.products || [];
    return (
      <Panel>
        <form className="mb-4" onSubmit={(event) => { event.preventDefault(); router.push(`?q=${encodeURIComponent(query)}`); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or SKU" className="w-full sm:w-80 rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
        </form>
        {rows.length === 0 ? <p className="text-sm text-[#5C5852]">No catalogue products match this filter.</p> : (
          <ul className="divide-y divide-[#E5E3DD] text-sm">
            {rows.map((row: any) => (
              <li key={row.slug} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-[#5C5852]">{row.slug} · {row.sku || 'SKU unresolved'} · import status {row.importStatus}</p>
                </div>
                <Link className="text-sm font-semibold underline" href={`/${locale}/admin/products/${row.slug}`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (module === 'audit') {
    const actor = (search.get('actor') || '').toLowerCase();
    const action = (search.get('action') || '').toLowerCase();
    const rows = (payload?.entries || []).filter((entry: any) => {
      if (actor && !`${entry.actor} ${entry.role}`.toLowerCase().includes(actor)) return false;
      if (action && !`${entry.action} ${entry.entity} ${entry.category}`.toLowerCase().includes(action)) return false;
      if (query && !`${entry.action} ${entry.entityId} ${entry.actor}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    return (
      <Panel>
        <form className="grid sm:grid-cols-3 gap-2 mb-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); router.push(`?q=${form.get('q') || ''}&actor=${form.get('actor') || ''}&action=${form.get('action') || ''}`); }}>
          <input name="q" defaultValue={search.get('q') || ''} placeholder="Search audit" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
          <input name="actor" defaultValue={search.get('actor') || ''} placeholder="Actor or role" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
          <input name="action" defaultValue={search.get('action') || ''} placeholder="Action, entity, category" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" />
          <button className="rounded-lg bg-[#4A5D4E] text-white px-3 py-2 text-sm sm:col-span-3 sm:w-fit" type="submit">Apply filters</button>
        </form>
        {rows.length === 0 ? <p className="text-sm text-[#5C5852]">No audit entries match this filter.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[#5C5852]"><th className="py-2">When</th><th>Actor</th><th>Role</th><th>Entity</th><th>Action</th><th>Category</th><th>Severity</th></tr></thead>
              <tbody>
                {rows.slice(0, 100).map((entry: any) => (
                  <tr key={entry.id} className="border-t border-[#E5E3DD]">
                    <td className="py-2 whitespace-nowrap">{entry.timestamp}</td>
                    <td>{entry.actor}</td>
                    <td>{entry.role}</td>
                    <td>{entry.entity} {entry.entityId}</td>
                    <td>{entry.action}</td>
                    <td>{entry.category}</td>
                    <td>{entry.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    );
  }

  const products = catalogue?.products || [];
  const specialistHref = `/${locale}/admin/catalogue/review-workspace/specialist-review`;
  const focus = module === 'media' ? products.filter((row: any) => row.media === 'MEDIA_REVIEW')
    : module === 'translations' ? products.filter((row: any) => row.translation === 'PENDING')
    : module === 'compliance' ? products.filter((row: any) => row.compliance === 'REQUIRES_REVIEW')
    : module === 'countries' ? products.filter((row: any) => row.country === 'NOT_CONFIGURED')
    : module === 'content' ? products.filter((row: any) => row.content === 'INTERNAL_SOURCE_ONLY')
    : products;

  if (module === 'catalogue' || module === 'catalogue-report') {
    if (!catalogue?.available) return <StateMessage message={catalogue?.error || 'Catalogue operations are unavailable.'} onRetry={load} />;
    return (
      <div className="space-y-4">
        <Panel title="Data review">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Link href={`/${locale}/admin/catalogue/review-workspace/first-batch`}>Pending {catalogue.dataPending}</Link>
            <Link href={`/${locale}/admin/catalogue/review-workspace/first-batch`}>Adjudicated {catalogue.dataAdjudicated}</Link>
            <Link href={`/${locale}/admin/catalogue/review-workspace/first-batch`}>Deferred {catalogue.dataDeferred}</Link>
          </div>
        </Panel>
        <Panel title="Specialist review">
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <Link href={specialistHref}>Pricing pending {catalogue.pricingPending}</Link>
            <Link href={`${specialistHref}`}>Compliance pending {catalogue.compliancePending}</Link>
            <Link href={`/${locale}/admin/compliance/countries`}>Country not configured {catalogue.countryPending}</Link>
            <Link href={`/${locale}/admin/content`}>Content internal-only {catalogue.contentInternal}</Link>
            <Link href={`/${locale}/admin/catalogue/media`}>Media verified {catalogue.mediaVerified} · review {catalogue.mediaReview}</Link>
            <Link href={`/${locale}/admin/catalogue/translations`}>Translations pending {catalogue.translationPending}</Link>
          </div>
          <p className="mt-3 text-sm font-semibold">{catalogue.specialistPending} products in specialist review</p>
        </Panel>
        <Panel title="Publication">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <span>Not ready {catalogue.publicationNotReady}</span>
            <span>Ready {catalogue.publicationReady}</span>
            <span>Published {catalogue.published}</span>
            <span>Do not publish {catalogue.doNotPublish}</span>
          </div>
          <p className="mt-3 text-xs text-[#5C5852]">These figures describe the saved review state. This screen does not publish products.</p>
        </Panel>
      </div>
    );
  }

  if (module === 'sales') {
    if (!payload?.ordersAvailable) return <StateMessage message={payload?.ordersError || 'Sales figures are unavailable.'} onRetry={load} />;
    return (
      <Panel title="Recorded order counts">
        <ul className="text-sm space-y-1">
          {Object.entries(payload.orderCounts).map(([status, count]) => <li key={status}>{status}: {String(count)}</li>)}
        </ul>
      </Panel>
    );
  }

  if (module === 'operations') {
    return (
      <Panel title="Operations">
        <p className="text-sm">Production: {payload?.productionState}</p>
        <p className="text-sm">Low stock records: {payload?.inventory?.available ? payload.inventory.lowStock : payload?.inventory?.error || 'Unavailable'}</p>
        <p className="text-sm">Out of stock records: {payload?.inventory?.available ? payload.inventory.outOfStock : '—'}</p>
        {payload?.launchError && <p className="text-sm mt-2">{payload.launchError}</p>}
        <Link className="mt-3 inline-block text-sm underline" href={`/${locale}/admin/system/launch`}>Launch control</Link>
      </Panel>
    );
  }

  return (
    <Panel>
      {focus.length === 0 ? <p className="text-sm text-[#5C5852]">No catalogue products match this filter.</p> : (
        <ul className="divide-y divide-[#E5E3DD] text-sm">
          {focus.map((row: any) => (
            <li key={row.slug} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-[#5C5852]">{row.slug} · {row.compliance} · {row.country} · {row.content} · {row.media} · {row.translation} · {row.publication}</p>
              </div>
              <div className="flex gap-3">
                <Link className="underline" href={`/${locale}/admin/products/${row.slug}`}>Product</Link>
                <Link className="underline" href={specialistHref}>Specialist workspace</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-[#5C5852]">Decisions stay in the specialist workspace. This list does not approve compliance, countries, content, or publication.</p>
    </Panel>
  );
}
