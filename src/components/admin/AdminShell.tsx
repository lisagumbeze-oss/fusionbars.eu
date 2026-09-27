'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
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
      { section: 'specialist-review', label: 'Specialist Review', href: '/admin/catalogue/review-workspace/specialist-review' },
      { section: 'media-review', label: 'Media Review', href: '/admin/catalogue/media' },
      { section: 'translation-review', label: 'Translation Review', href: '/admin/catalogue/translations' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { section: 'compliance', label: 'Compliance', href: '/admin/compliance' },
      { section: 'countries', label: 'Country Eligibility', href: '/admin/compliance/countries' },
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
      { section: 'roles', label: 'Roles & Permissions', href: '/admin/system/roles' },
      { section: 'launch', label: 'Launch Control', href: '/admin/system/launch' },
    ],
  },
];

const TITLES: Array<{ test: (path: string) => boolean; title: string; description: string }> = [
  { test: (path) => path.endsWith('/admin'), title: 'Operations dashboard', description: 'Live commerce, catalogue, and governance workload.' },
  { test: (path) => path.includes('/admin/orders'), title: 'Orders', description: 'Canonical order lifecycle and fulfilment.' },
  { test: (path) => path.includes('/admin/payments'), title: 'Payment verification', description: 'Bank transfer and crypto evidence awaiting a human decision.' },
  { test: (path) => path.includes('/admin/customers'), title: 'Customers', description: 'Directory of checkout contacts. Authentication secrets are not shown.' },
  { test: (path) => path.includes('/admin/promotions'), title: 'Promotions', description: 'Coupons and discount rules that sit on top of approved prices.' },
  { test: (path) => path.includes('/admin/inventory'), title: 'Inventory', description: 'Hub stock, reservations, and low-stock thresholds.' },
  { test: (path) => path.includes('/admin/products/'), title: 'Product administration', description: 'Source facts and human decisions, kept visually distinct.' },
  { test: (path) => path.includes('/admin/products'), title: 'Products', description: 'Catalogue identities available to authorised roles.' },
  { test: (path) => path.includes('/specialist-review'), title: 'Specialist review', description: 'Existing specialist workspace. Decisions are not made from the dashboard.' },
  { test: (path) => path.includes('/admin/catalogue/media'), title: 'Media review', description: 'Products whose media still needs a human check.' },
  { test: (path) => path.includes('/admin/catalogue/translations'), title: 'Translation review', description: 'Locale workflow still waiting for human text.' },
  { test: (path) => path.includes('/admin/catalogue'), title: 'Catalogue operations', description: 'Data, specialist, and publication state for the current review batch.' },
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
  { test: (path) => path.includes('/system/roles'), title: 'Roles and permissions', description: 'What each role can see. Editing a role here does not grant access.' },
  { test: (path) => path.includes('/system/launch'), title: 'Launch control', description: 'Production stays paused until every blocker is actually cleared.' },
];

const AdminRoleContext = createContext<{ role: RoleName; setRole: (role: RoleName) => void }>({
  role: 'SUPER_ADMIN',
  setRole: () => undefined,
});

export function useAdminRole() {
  return useContext(AdminRoleContext);
}

const ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER', 'CUSTOMER'];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ locale: string }>();
  const pathname = usePathname() || '';
  const locale = params?.locale || 'en';
  const [role, setRole] = useState<RoleName>('SUPER_ADMIN');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('fusion-admin-role') as RoleName | null;
    if (stored && ROLES.includes(stored)) setRole(stored);
    setCollapsed(window.localStorage.getItem('fusion-admin-nav') === 'collapsed');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('fusion-admin-role', role);
  }, [role]);

  const visible = useMemo(() => new Set(AdminAccess.sections(role)), [role]);
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
    <AdminRoleContext.Provider value={{ role, setRole }}>
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
              <div className="relative">
                <button type="button" className="rounded-md border border-[#E5E3DD] px-3 py-2 text-xs font-semibold" onClick={() => setAccountOpen((open) => !open)}>
                  {role}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E5E3DD] bg-white p-3 shadow-lg">
                    <label className="text-[11px] font-semibold text-[#5C5852]" htmlFor="admin-role">Acting role</label>
                    <select
                      id="admin-role"
                      value={role}
                      onChange={(event) => setRole(event.target.value as RoleName)}
                      className="mt-1 w-full rounded-lg border border-[#E5E3DD] px-2 py-1.5 text-xs"
                    >
                      {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <p className="mt-2 text-[11px] text-[#5C5852]">The server still rejects actions this role cannot perform.</p>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </AdminRoleContext.Provider>
  );
}
