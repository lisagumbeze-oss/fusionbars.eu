'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { logoutAdminAction } from '@/actions/admin-auth';
import { Menu, X, Bell, ChevronLeft } from 'lucide-react';
import { AdminAccess, AdminSection } from '@/domain/admin/AdminAccess';
import { RoleName } from '@/types';

interface NavItem {
  section: AdminSection;
  label: string;
  href: string;
}

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Overview', items: [{ section: 'dashboard', label: 'Dashboard', href: '/admin' }] },
  {
    label: 'Commerce',
    items: [
      { section: 'orders', label: 'Orders', href: '/admin/orders' },
      { section: 'payments', label: 'Payments', href: '/admin/payments' },
      { section: 'payments', label: 'Payment settings', href: '/admin/settings/payments' },
      { section: 'pricing', label: 'Pricing', href: '/admin/pricing' },
      { section: 'customers', label: 'Customers', href: '/admin/customers' },
      { section: 'promotions', label: 'Promotions', href: '/admin/promotions' },
      { section: 'inventory', label: 'Inventory', href: '/admin/inventory' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { section: 'products', label: 'Products', href: '/admin/products' },
      { section: 'catalogue-review', label: 'Catalogue Review', href: '/admin/catalogue' },
      { section: 'catalogue-review', label: 'Review Queue', href: '/admin/catalogue/review-queue' },
      { section: 'specialist-review', label: 'Specialist Review', href: '/admin/catalogue/review-workspace/specialist-review' },
      { section: 'publication', label: 'Publication', href: '/admin/catalogue/publication' },
      { section: 'media-review', label: 'Media Review', href: '/admin/catalogue/media' },
      { section: 'translation-review', label: 'Translation Review', href: '/admin/catalogue/translations' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { section: 'compliance', label: 'Compliance', href: '/admin/compliance' },
      { section: 'countries', label: 'Country Eligibility', href: '/admin/compliance/countries' },
      { section: 'shipping', label: 'Shipping', href: '/admin/shipping' },
      { section: 'content-review', label: 'Content Review', href: '/admin/content' },
      { section: 'audit', label: 'Audit Logs', href: '/admin/audit' },
    ],
  },
  {
    label: 'Communications',
    items: [
      { section: 'notifications', label: 'Notifications', href: '/admin/notifications' },
      { section: 'email-templates', label: 'Email Templates', href: '/admin/system/email-templates' },
      { section: 'email-delivery', label: 'Email Delivery Logs', href: '/admin/system/email-delivery' },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { section: 'sales-reports', label: 'Sales Reports', href: '/admin/reports/sales' },
      { section: 'catalogue-reports', label: 'Catalogue Reports', href: '/admin/reports/catalogue' },
      { section: 'ops-reports', label: 'Operational Reports', href: '/admin/reports/operations' },
    ],
  },
  {
    label: 'System',
    items: [
      { section: 'settings', label: 'Settings', href: '/admin/system/settings' },
      { section: 'commercial-settings', label: 'Commercial settings', href: '/admin/settings/commercial' },
      { section: 'roles', label: 'Roles & Permissions', href: '/admin/system/roles' },
      { section: 'launch', label: 'Launch Control', href: '/admin/system/launch' },
    ],
  },
];

const TITLES: Array<{ test: (path: string) => boolean; title: string; description: string }> = [
  { test: (path) => path.endsWith('/admin'), title: 'Operations dashboard', description: 'Live commerce, catalogue, and governance workload.' },
  { test: (path) => path.includes('/admin/orders'), title: 'Orders', description: 'Canonical order lifecycle and fulfilment.' },
  { test: (path) => path.includes('/admin/settings/payments'), title: 'Payment settings', description: 'Bank transfer and crypto readiness. Placeholder credentials cannot become active.' },
  { test: (path) => path.includes('/admin/payments'), title: 'Payment verification', description: 'Bank transfer and crypto evidence awaiting a human decision.' },
  { test: (path) => path.includes('/admin/pricing'), title: 'Commercial pricing', description: 'Approved selling prices stay separate from source prices. Missing prices stay unconfigured.' },
  { test: (path) => path.includes('/admin/settings/commercial'), title: 'Commercial settings', description: 'Currency, tax, shipping, and promotion policy. Production stays paused.' },
  { test: (path) => path.includes('/admin/customers'), title: 'Customers', description: 'Directory of checkout contacts. Authentication secrets are not shown.' },
  { test: (path) => path.includes('/admin/promotions'), title: 'Promotions', description: 'Coupons and discount rules that sit on top of approved prices.' },
  { test: (path) => path.includes('/admin/inventory'), title: 'Inventory', description: 'Hub stock, reservations, and low-stock thresholds.' },
  { test: (path) => path.includes('/admin/products/'), title: 'Product administration', description: 'Source facts and human decisions, kept visually distinct.' },
  { test: (path) => path.includes('/admin/products'), title: 'Products', description: 'Catalogue identities available to authorised roles.' },
  { test: (path) => path.includes('/specialist-review'), title: 'Specialist review', description: 'Existing specialist workspace. Decisions are not made from the dashboard.' },
  { test: (path) => path.includes('/admin/catalogue/publication'), title: 'Publication control', description: 'Readiness is not publication. A product goes live only after an authorised publish action.' },
  { test: (path) => path.includes('/admin/catalogue/review-queue'), title: 'Catalogue review queue', description: 'Paginated human review. Priority is review order, not approval.' },
  { test: (path) => path.includes('/admin/catalogue/media'), title: 'Media review', description: 'Products whose media still needs a human check.' },
  { test: (path) => path.includes('/admin/catalogue/translations'), title: 'Translation review', description: 'Locale workflow still waiting for human text.' },
  { test: (path) => path.includes('/admin/catalogue'), title: 'Catalogue operations', description: 'Data, specialist, and publication state for the current review batch.' },
  { test: (path) => path.includes('/admin/shipping'), title: 'Shipping and destinations', description: 'Store shipping, product eligibility, and fulfilment routing stay separate. Missing eligibility is not approval.' },
  { test: (path) => path.includes('/admin/compliance/countries'), title: 'Country eligibility', description: 'Country decisions stay unresolved until a compliance officer records them.' },
  { test: (path) => path.includes('/admin/compliance'), title: 'Compliance', description: 'Compliance reviews that are still pending.' },
  { test: (path) => path.includes('/admin/content'), title: 'Content review', description: 'Internal source content that has not been approved for the public site.' },
  { test: (path) => path.includes('/admin/audit'), title: 'Audit logs', description: 'Traceable commercial, catalogue, and governance actions.' },
  { test: (path) => path.includes('/admin/notifications'), title: 'Notifications', description: 'Operational items that correspond to current records.' },
  { test: (path) => path.includes('/email-templates'), title: 'Email templates', description: 'Transactional templates rendered by the existing email service.' },
  { test: (path) => path.includes('/email-delivery'), title: 'Email delivery', description: 'Dispatch outcomes without provider payloads or secrets.' },
  { test: (path) => path.includes('/reports/sales'), title: 'Sales reports', description: 'Figures counted from recorded orders.' },
  { test: (path) => path.includes('/reports/catalogue'), title: 'Catalogue reports', description: 'Current specialist and publication counts.' },
  { test: (path) => path.includes('/reports/operations'), title: 'Operational reports', description: 'Launch, inventory, and fulfilment workload.' },
  { test: (path) => path.includes('/system/settings'), title: 'System settings', description: 'Store configuration status. Secret values are not rendered.' },
  { test: (path) => path.includes('/system/roles'), title: 'Roles and permissions', description: 'Super Admin is the only admin account and can open every section.' },
  { test: (path) => path.includes('/system/launch'), title: 'Launch control', description: 'Production stays paused until every blocker is actually cleared.' },
];

const ADMIN_ROLE: RoleName = 'SUPER_ADMIN';

const AdminRoleContext = createContext<{ role: RoleName }>({
  role: ADMIN_ROLE,
});

export function useAdminRole() {
  return useContext(AdminRoleContext);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ locale: string }>();
  const pathname = usePathname() || '';
  const router = useRouter();
  const locale = params?.locale || 'en';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.removeItem('fusion-admin-role');
    setCollapsed(window.localStorage.getItem('fusion-admin-nav') === 'collapsed');
  }, []);

  const visible = useMemo(() => new Set(AdminAccess.sections(ADMIN_ROLE)), []);
  const meta = TITLES.find((item) => item.test(pathname)) || TITLES[0];
  const crumbs = pathname.split('/').filter((part) => part && part !== locale);

  const nav = (
    <nav aria-label="Admin" className="space-y-5">
      {GROUPS.map((group) => {
        const items = group.items.filter((item) => visible.has(item.section));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            {!collapsed && <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">{group.label}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const href = `/${locale}${item.href}`;
                const active = pathname === href || (item.href !== '/admin' && pathname.startsWith(href));
                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-lg px-3 py-2 text-sm ${active ? 'bg-[#4A5D4E] text-white' : 'text-stone-200 hover:bg-white/10'}`}
                    >
                      {collapsed ? item.label.slice(0, 1) : item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <AdminRoleContext.Provider value={{ role: ADMIN_ROLE }}>
      <div className="min-h-screen bg-[#F4F3EF] text-[#121212] md:flex">
        <aside className={`hidden md:flex md:flex-col shrink-0 bg-[#171715] text-white ${collapsed ? 'w-16' : 'w-64'} min-h-screen p-3`}>
          <div className="flex items-center justify-between px-2 py-2 mb-4">
            {!collapsed && <span className="font-serif text-lg">Fusion EU</span>}
            <button
              type="button"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={() => {
                const next = !collapsed;
                setCollapsed(next);
                window.localStorage.setItem('fusion-admin-nav', next ? 'collapsed' : 'open');
              }}
              className="rounded-md p-1 text-stone-300 hover:bg-white/10"
            >
              <ChevronLeft className={`w-4 h-4 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">{nav}</div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full w-72 bg-[#171715] text-white p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="font-serif text-lg">Fusion EU</span>
                <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              {nav}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#E5E3DD] bg-[#FBFBF9]/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" className="md:hidden rounded-md border border-[#E5E3DD] p-2" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <nav aria-label="Breadcrumb" className="text-[11px] text-[#5C5852] truncate">
                  {crumbs.map((part, index) => (
                    <span key={`${part}-${index}`}>{index > 0 ? ' / ' : ''}{part}</span>
                  ))}
                </nav>
                <h1 className="font-serif text-xl sm:text-2xl leading-tight">{meta.title}</h1>
                <p className="text-xs text-[#5C5852] hidden sm:block">{meta.description}</p>
              </div>
              <Link href={`/${locale}/admin/notifications`} className="rounded-md border border-[#E5E3DD] p-2" aria-label="Notification center">
                <Bell className="w-4 h-4" />
              </Link>
              <span className="rounded-md border border-[#E5E3DD] px-3 py-2 text-xs font-semibold">Super Admin</span>
              <button
                type="button"
                className="rounded-md border border-[#E5E3DD] px-3 py-2 text-xs font-semibold"
                onClick={async () => {
                  await logoutAdminAction();
                  router.replace(`/${locale}/admin/login`);
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </div>
          </header>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </AdminRoleContext.Provider>
  );
}
