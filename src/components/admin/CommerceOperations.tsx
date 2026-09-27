'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Filter,
  Eye,
  ArrowRight,
  ExternalLink,
  Globe2,
  History,
  FileCheck2,
  XCircle,
  HelpCircle,
  Package,
  CreditCard,
  Truck,
  Plus,
  RefreshCw,
  BarChart3,
  Users,
  Tag,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import catalogueData from '@/data/consolidated-catalogue.json';
import { CANONICAL_ORDER_STATUSES, NormalizedProduct, OrderStatus, RoleName } from '@/types';
import { useCommerce } from '@/context/CommerceContext';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { ProductPurchaseEligibilityService } from '@/domain/catalog/ProductPurchaseEligibilityService';
import { getAllOrdersAdminAction, updateOrderStatusAdminAction } from '@/actions/orders';
import { verifyPaymentStatusAction } from '@/actions/payments';
import { getInventoryMatrixAction, adjustInventoryAction } from '@/actions/inventory';
import { createCouponAction } from '@/actions/coupons';

export function CommerceOperations({ initialTab = 'orders' }: { initialTab?: 'orders' | 'inventory' | 'coupons' | 'reporting' | 'catalog' | 'restrictions' }) {
  const { locale, formatMoney } = useCommerce();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'coupons' | 'reporting' | 'catalog' | 'restrictions'>(initialTab);

  // Admin Actor Role — shared with the admin shell
  const [currentRole, setCurrentRole] = useState<RoleName>('SUPER_ADMIN');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [hubOrderFilter, setHubOrderFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Status Transition Modal
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('PAYMENT_VERIFIED');
  const [transitionNote, setTransitionNote] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [carrierInput, setCarrierInput] = useState('PostNL Discreet Priority');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Inventory State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [hubFilter, setHubFilter] = useState<string>('ALL');
  const [selectedVariantForAdjust, setSelectedVariantForAdjust] = useState<any | null>(null);
  const [adjustHub, setAdjustHub] = useState<'NL' | 'ES' | 'DE' | 'FR'>('NL');
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('RESTOCK');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number>(15);
  const [couponIsPercent, setCouponIsPercent] = useState<boolean>(true);
  const [couponMinSpend, setCouponMinSpend] = useState<number>(5000);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Catalogue Governance State (Phase 2.5)
  const products: NormalizedProduct[] = (catalogueData as any).products;
  const categories = (catalogueData as any).categories;
  const [catalogSearch, setCatalogSearch] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'APPROVED' | 'REQUIRES_REVIEW' | 'BLOCKED'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<NormalizedProduct | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('fusion-admin-role');
    if (stored) setCurrentRole(stored as RoleName);
    const status = searchParams.get('status');
    if (status) setOrderStatusFilter(status);
    const q = searchParams.get('q');
    if (q) setOrderSearch(q);
    const hub = searchParams.get('hub');
    if (hub) setHubOrderFilter(hub);
  }, [searchParams]);

  useEffect(() => {
    window.localStorage.setItem('fusion-admin-role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    loadOrders();
    loadInventory();
  }, [currentRole]);

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await getAllOrdersAdminAction(currentRole);
      if (res.success && res.orders) {
        setOrders(res.orders);
      } else {
        setOrders([]);
        setOrdersError(res.error || 'Orders are unavailable.');
      }
    } catch (err: any) {
      setOrders([]);
      setOrdersError(err.message || 'Orders are unavailable.');
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadInventory() {
    setInventoryLoading(true);
    try {
      const res = await getInventoryMatrixAction(currentRole);
      if (res.success && res.inventory) {
        setInventoryList(res.inventory);
      }
    } finally {
      setInventoryLoading(false);
    }
  }

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsTransitioning(true);

    try {
      const res = await updateOrderStatusAdminAction({
        orderId: selectedOrder.id,
        newStatus: targetStatus,
        actorRole: currentRole,
        actorId: 'admin-operations-desk',
        note: transitionNote.trim() || undefined,
        trackingNumber: trackingNumberInput.trim() || undefined,
        carrierName: carrierInput.trim() || undefined,
      });

      if (!res.success) {
        alert(res.error || 'Transition failed');
      } else {
        alert(`Order successfully transitioned to ${targetStatus}`);
        setSelectedOrder(null);
        setTransitionNote('');
        setTrackingNumberInput('');
        loadOrders();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantForAdjust) return;
    setAdjustSubmitting(true);

    try {
      const res = await adjustInventoryAction(
        {
          variantId: selectedVariantForAdjust.variantId,
          locationCode: adjustHub,
          quantityDelta: Number(adjustDelta),
          reason: adjustReason,
        },
        currentRole
      );

      if (!res.success) {
        alert(res.error || 'Adjustment failed');
      } else {
        alert(res.message);
        setSelectedVariantForAdjust(null);
        loadInventory();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createCouponAction(
        {
          code: couponCode.trim(),
          discount: Number(couponDiscount),
          isPercent: couponIsPercent,
          minSpendEUR: Number(couponMinSpend),
        },
        currentRole
      );

      if (res.success) {
        setCouponSuccess(`Coupon ${couponCode.toUpperCase()} activated successfully.`);
        setCouponCode('');
      } else {
        alert(res.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    const matchesSearch =
      orderSearch === '' ||
      o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.guestEmail?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.shippingAddress?.lastName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.shippingAddress?.firstName?.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesPayment = paymentMethodFilter === 'ALL' || o.paymentMethodCode === paymentMethodFilter;
    const matchesHub = hubOrderFilter === 'ALL' || o.shippingOriginHub === hubOrderFilter;
    const created = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    const matchesFrom = !dateFrom || created >= new Date(dateFrom).getTime();
    const matchesTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`).getTime();
    const min = amountMin === '' ? null : Math.round(Number(amountMin) * 100);
    const max = amountMax === '' ? null : Math.round(Number(amountMax) * 100);
    const matchesMin = min === null || Number.isNaN(min) || (o.totalAmount || 0) >= min;
    const matchesMax = max === null || Number.isNaN(max) || (o.totalAmount || 0) <= max;
    return matchesStatus && matchesSearch && matchesPayment && matchesHub && matchesFrom && matchesTo && matchesMin && matchesMax;
  });

  // Filtered Inventory
  const filteredInventory = inventoryList.filter((it) => {
    const matchesHub = hubFilter === 'ALL' || it.locationCode === hubFilter;
    const matchesSearch =
      inventorySearch === '' ||
      it.sku?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      it.productName?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      it.variantName?.toLowerCase().includes(inventorySearch.toLowerCase());
    return matchesHub && matchesSearch;
  });

  // Reporting Metrics
  const totalRevenueEUR = orders
    .filter((o) => o.currency === 'EUR' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRevenueGBP = orders
    .filter((o) => o.currency === 'GBP' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingPaymentCount = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const paymentSubmittedCount = orders.filter((o) => o.status === 'PAYMENT_SUBMITTED').length;
  const processingCount = orders.filter((o) => o.status === 'PROCESSING').length;
  const shippedCount = orders.filter((o) => o.status === 'SHIPPED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Top Header */}
      <div className="border-b border-[#E5E3DD] pb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852] mb-1">
              <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
              <span>/</span>
              <span className="text-[#121212] font-medium">Commerce Operations</span>
            </nav>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212] flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#4A5D4E]" />
              European Commerce Operations
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5852] mt-1">
              Authoritative Order Pipeline &bull; Multi-Hub Inventory (NL, ES, DE, FR) &bull; SEPA &amp; Crypto Auditing
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/${locale}/admin/catalogue/review`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E]"
              >
                Catalogue Review Center
              </Link>
              <Link
                href={`/${locale}/admin/catalogue/adjudication`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#4A5D4E] text-[#4A5D4E] hover:bg-[#4A5D4E] hover:text-white"
              >
                Adjudication Workspace
              </Link>
              <Link
                href={`/${locale}/admin/catalogue/recommendations`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#2B4C6F] text-[#2B4C6F] hover:bg-[#2B4C6F] hover:text-white"
              >
                Decision Recommendations
              </Link>
              <Link
                href={`/${locale}/admin/catalogue/review-workspace`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#5B3A7A] text-[#5B3A7A] hover:bg-[#5B3A7A] hover:text-white"
              >
                Guided Review Workspace
              </Link>
              <Link
                href={`/${locale}/admin/catalogue/review-workspace/first-batch`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E] hover:text-white"
              >
                First Adjudication Batch
              </Link>
              <Link
                href={`/${locale}/admin/catalogue/imports`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E3DD] text-[#121212] hover:bg-white"
              >
                Master Import Registry
              </Link>
            </div>
          </div>

          {/* RBAC Role Selector */}
          <div className="bg-white p-2.5 rounded-xl border border-[#E5E3DD] text-xs flex items-center gap-2 shadow-xs">
            <span className="text-[#5C5852] font-semibold">Active Role:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as any)}
              className="font-bold text-[#121212] bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#E5E3DD] focus:outline-none"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full Governance)</option>
              <option value="FINANCE_MANAGER">FINANCE_MANAGER (Payment Audit)</option>
              <option value="ORDER_MANAGER">ORDER_MANAGER (Hub &amp; Dispatch)</option>
              <option value="CATALOG_MANAGER">CATALOG_MANAGER (Catalogue &amp; Stock)</option>
            </select>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex overflow-x-auto gap-4 pt-4 border-t border-[#E5E3DD]/60">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'orders' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'inventory' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Hub Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'coupons' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Coupons &amp; Promos</span>
          </button>
          <button
            onClick={() => setActiveTab('reporting')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'reporting' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Commerce Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'catalog' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Catalogue Governance</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: ORDERS ================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Metrics summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider">Awaiting Payment</span>
              <p className="text-2xl font-bold font-serif text-amber-700 mt-1">{pendingPaymentCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider">Proof Submitted</span>
              <p className="text-2xl font-bold font-serif text-blue-700 mt-1">{paymentSubmittedCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider">Packaging Queue</span>
              <p className="text-2xl font-bold font-serif text-indigo-700 mt-1">{processingCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider">In Transit</span>
              <p className="text-2xl font-bold font-serif text-purple-700 mt-1">{shippedCount}</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E5E3DD]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[#5C5852]">Status:</span>
              {['ALL', ...CANONICAL_ORDER_STATUSES].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    orderStatusFilter === st
                      ? 'bg-[#4A5D4E] text-white'
                      : 'bg-neutral-100 text-[#5C5852] hover:bg-neutral-200'
                  }`}
                >
                  {st.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <input type="search" placeholder="Order, customer, email" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD]" />
              <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD]">
                <option value="ALL">All payment methods</option>
                <option value="SEPA_IBAN">SEPA / IBAN</option>
                <option value="CRYPTO_BTC">Bitcoin</option>
                <option value="CRYPTO_USDT">USDT</option>
              </select>
              <select value={hubOrderFilter} onChange={(e) => setHubOrderFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD]">
                <option value="ALL">All hubs</option>
                <option value="NL">NL</option>
                <option value="ES">ES</option>
                <option value="DE">DE</option>
                <option value="FR">FR</option>
              </select>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD]" aria-label="From date" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD]" aria-label="To date" />
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" placeholder="Min" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5E3DD]" />
                <input type="number" min="0" step="0.01" placeholder="Max" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5E3DD]" />
              </div>
            </div>
            {selectedOrderIds.length > 0 && (
              <p className="text-xs text-[#5C5852]">
                {selectedOrderIds.length} selected. Bulk status changes stay disabled so every transition remains individually auditable.
              </p>
            )}
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-[#E5E3DD] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F5] border-b border-[#E5E3DD] text-[#5C5852] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Select</th>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Hub</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Canonical Status</th>
                    <th className="py-3 px-4">Placed</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DD]">
                  {ordersLoading ? (
                    <tr><td colSpan={11} className="py-8 text-center text-[#5C5852]">Loading orders…</td></tr>
                  ) : ordersError ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-[#5C5852]">
                        <p>{ordersError}</p>
                        <button type="button" onClick={loadOrders} className="mt-2 text-xs font-semibold text-[#4A5D4E] underline">Retry</button>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-[#5C5852]">
                        No orders matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-neutral-50 transition">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${ord.orderNumber}`}
                            checked={selectedOrderIds.includes(ord.id)}
                            onChange={(e) => setSelectedOrderIds((ids) => e.target.checked ? [...ids, ord.id] : ids.filter((id) => id !== ord.id))}
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#121212]">{ord.orderNumber}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#121212]">
                            {ord.shippingAddress?.firstName} {ord.shippingAddress?.lastName}
                          </p>
                          <p className="text-[11px] text-[#5C5852]">{ord.guestEmail}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold">{ord.shippingAddress?.countryCode}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-100 font-bold">
                            {ord.shippingOriginHub}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {ord.currency === 'GBP' ? '£' : '€'}{(ord.totalAmount / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] text-[#5C5852] block font-mono">{ord.paymentMethodCode}</span>
                          {ord.paymentReference && (
                            <span className="text-[10px] text-blue-700 truncate max-w-[100px] block" title={ord.paymentReference}>
                              Ref: {ord.paymentReference}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'PENDING_PAYMENT'
                                ? 'bg-amber-100 text-amber-800'
                                : ord.status === 'PAYMENT_SUBMITTED'
                                ? 'bg-blue-100 text-blue-800'
                                : ord.status === 'PAYMENT_VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'PROCESSING'
                                ? 'bg-indigo-100 text-indigo-800'
                                : ord.status === 'SHIPPED'
                                ? 'bg-purple-100 text-purple-800'
                                : ord.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-[#5C5852]">{ord.createdAt ? new Date(ord.createdAt).toLocaleString() : '—'}</td>
                        <td className="py-3 px-4 text-[11px] text-[#5C5852]">{ord.updatedAt ? new Date(ord.updatedAt).toLocaleString() : '—'}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setTargetStatus(ord.status === 'PAYMENT_SUBMITTED' ? 'PAYMENT_VERIFIED' : 'PROCESSING');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#4A5D4E] text-white hover:bg-[#3B4A3E]"
                          >
                            Transition
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INVENTORY MATRIX ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-[#E5E3DD]">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#5C5852]">Fulfilment Hub:</span>
              {['ALL', 'NL', 'DE', 'ES', 'FR'].map((h) => (
                <button
                  key={h}
                  onClick={() => setHubFilter(h)}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    hubFilter === h ? 'bg-[#4A5D4E] text-white' : 'bg-neutral-100 text-[#5C5852] hover:bg-neutral-200'
                  }`}
                >
                  {h === 'ALL' ? 'All Hubs' : `${h} Hub`}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#5C5852]" />
              <input
                type="text"
                placeholder="Search SKU or variant..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD]"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E3DD] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F5] border-b border-[#E5E3DD] text-[#5C5852] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">SKU / Variant</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Hub Facility</th>
                    <th className="py-3 px-4">On Hand</th>
                    <th className="py-3 px-4">Reserved</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4">Status Alert</th>
                    <th className="py-3 px-4 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DD]">
                  {filteredInventory.slice(0, 50).map((inv, idx) => {
                    const available = Math.max(0, inv.quantityOnHand - inv.quantityReserved);
                    const isLow = inv.quantityOnHand <= (inv.lowStockThreshold || 15);

                    return (
                      <tr key={idx} className="hover:bg-neutral-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#121212]">{inv.sku}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#121212]">{inv.productName}</p>
                          <p className="text-[11px] text-[#5C5852]">{inv.variantName}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-neutral-100">
                            {inv.locationCode} Hub
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{inv.quantityOnHand}</td>
                        <td className="py-3 px-4 font-mono text-[#5C5852]">{inv.quantityReserved}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#4A5D4E]">{available}</td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3" /> LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              OPTIMAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVariantForAdjust(inv);
                              setAdjustHub(inv.locationCode);
                              setAdjustDelta(25);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded border border-[#E5E3DD] hover:bg-neutral-100 text-[#121212]"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PROMOTIONS & COUPONS ================= */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-6">
            <h3 className="font-serif font-bold text-lg text-[#121212] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#4A5D4E]" /> Create Promotional Coupon
            </h3>
            <p className="text-xs text-[#5C5852]">
              Coupons discount an order total. They do not replace or convert an approved product price.
            </p>

            {couponSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{couponSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2026"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-[#E5E3DD]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                    Discount Amount
                  </label>
                  <input
                    type="number"
                    required
                    value={couponDiscount}
                    onChange={(e) => setCouponDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                    Type
                  </label>
                  <select
                    value={couponIsPercent ? 'percent' : 'cents'}
                    onChange={(e) => setCouponIsPercent(e.target.value === 'percent')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="cents">Fixed Minor Units (Cents)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Minimum Spend (Cents, e.g. 5000 = €50)
                </label>
                <input
                  type="number"
                  required
                  value={couponMinSpend}
                  onChange={(e) => setCouponMinSpend(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition"
              >
                Save &amp; Activate Coupon
              </button>
            </form>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#121212]">Active European Promotions</h3>
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-sm text-[#121212]">WELCOME10</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ACTIVE</span>
                </div>
                <p className="text-[#5C5852]">10% off for new customer onboarding &bull; Min spend €50.00</p>
              </div>

              <div className="p-4 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-sm text-[#121212]">EUROPE25</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ACTIVE</span>
                </div>
                <p className="text-[#5C5852]">€25.00 off tasting cases &bull; Min spend €150.00</p>
              </div>

              <div className="p-4 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-sm text-[#121212]">FREE SHIPPING</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">SYSTEM RULE</span>
                </div>
                <p className="text-[#5C5852]">Automatic Free Standard Shipping for all European orders &ge; €300.00</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: REPORTING & AUDIT ================= */}
      {activeTab === 'reporting' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#5C5852] uppercase tracking-wider">Gross European Revenue</span>
              <p className="text-3xl font-serif font-bold text-[#121212]">
                €{(totalRevenueEUR / 100).toFixed(2)}
              </p>
              <p className="text-xs text-[#5C5852]">+ £{(totalRevenueGBP / 100).toFixed(2)} GBP transactions</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#5C5852] uppercase tracking-wider">Total Orders Processed</span>
              <p className="text-3xl font-serif font-bold text-[#4A5D4E]">{orders.length}</p>
              <p className="text-xs text-[#5C5852]">Server-authoritative line items</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#5C5852] uppercase tracking-wider">Fulfilment Facilities</span>
              <p className="text-2xl font-serif font-bold text-[#121212]">4 European Hubs</p>
              <p className="text-xs text-[#5C5852]">Netherlands (NL) &bull; Spain (ES) &bull; Germany (DE) &bull; France (FR)</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: CATALOGUE GOVERNANCE (PHASE 2.5) ================= */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
          <h3 className="font-serif font-bold text-lg text-[#121212]">Content Governance Audit Matrix</h3>
          <p className="text-xs text-[#5C5852]">
            Ensures zero psychoactive, therapeutic, or unsupported dosage claims. Gated by ProductPurchaseEligibilityService.
          </p>

          <div className="divide-y divide-[#E5E3DD]">
            {products.map((p) => (
              <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#121212]">{p.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.complianceClassification === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.complianceClassification || 'APPROVED'}
                    </span>
                  </div>
                  <p className="text-[#5C5852] mt-0.5">{p.shortDescription}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#121212]">{p.variants.length} Variants</span>
                  <span className="block text-[11px] text-[#5C5852]">{p.categoryName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-lg w-full border border-[#E5E3DD] space-y-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#121212]">Update Order Status</h3>
                <p className="text-xs text-[#5C5852] font-mono">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleExecuteTransition} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Current Status
                </label>
                <div className="text-xs font-semibold text-[#4A5D4E] bg-[#F0F4F1] p-2 rounded border border-[#4A5D4E]/20">
                  {selectedOrder.status}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Target Canonical Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E5E3DD] bg-white"
                >
                  <option value="PAYMENT_VERIFIED">PAYMENT_VERIFIED (Finance Clearance)</option>
                  <option value="PROCESSING">PROCESSING (Logistics Packaging Queue)</option>
                  <option value="SHIPPED">SHIPPED (Handed to Courier)</option>
                  <option value="DELIVERED">DELIVERED (Customer Delivery Completed)</option>
                  <option value="CANCELLED">CANCELLED (Administrative Cancellation)</option>
                  <option value="REFUNDED">REFUNDED (Reversed Funds)</option>
                </select>
              </div>

              {targetStatus === 'SHIPPED' && (
                <div className="space-y-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">Tracking Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. POSTNL-EU-982184"
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-purple-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">Carrier Name</label>
                    <input
                      type="text"
                      required
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-purple-300 bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Transition Audit Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. SEPA bank memo verified or PostNL dispatch complete"
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#E5E3DD]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-xs text-[#5C5852] hover:text-[#121212]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransitioning}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] disabled:opacity-50"
                >
                  {isTransitioning ? 'Validating FSM Guard...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Adjustment Modal */}
      {selectedVariantForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-md w-full border border-[#E5E3DD] space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#121212]">Adjust Hub Stock</h3>
                <p className="text-xs text-[#5C5852] font-mono">{selectedVariantForAdjust.sku}</p>
              </div>
              <button onClick={() => setSelectedVariantForAdjust(null)} className="text-neutral-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#121212] mb-1">Hub Location</label>
                  <select
                    value={adjustHub}
                    onChange={(e) => setAdjustHub(e.target.value as any)}
                    className="w-full px-3 py-2 rounded border border-[#E5E3DD]"
                  >
                    <option value="NL">NL Hub (Netherlands)</option>
                    <option value="DE">DE Hub (Germany)</option>
                    <option value="ES">ES Hub (Spain)</option>
                    <option value="FR">FR Hub (France)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#121212] mb-1">Quantity Delta (+/-)</label>
                  <input
                    type="number"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-[#E5E3DD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] mb-1">Adjustment Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded border border-[#E5E3DD]"
                >
                  <option value="RESTOCK">RESTOCK (Warehouse Delivery Received)</option>
                  <option value="CYCLE_COUNT">CYCLE_COUNT (Physical Audit Reconciliation)</option>
                  <option value="DAMAGE_WRITE_OFF">DAMAGE_WRITE_OFF (Damaged / Broken Packaging)</option>
                  <option value="RETURN_RESTOCK">RETURN_RESTOCK (Returned Parcel Restocked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariantForAdjust(null)}
                  className="px-4 py-2 text-xs text-[#5C5852] hover:text-[#121212]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Adjusting...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
