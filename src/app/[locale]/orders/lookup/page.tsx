'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  Package,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { lookupOrderAction } from '@/actions/orders';
import { submitPaymentProofAction } from '@/actions/payments';
import { LocaleCode, OrderStatus } from '@/types';

export default function OrderLookupPage() {
  const params = useParams();
  const locale = (params.locale as LocaleCode) || 'en';

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);

  // Proof submission inside lookup
  const [proofRef, setProofRef] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofSuccess, setProofSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await lookupOrderAction({
        orderNumber: orderNumber.trim() || undefined,
        email: email.trim() || undefined,
        token: token.trim() || undefined,
      });

      if (!res.success || !res.order) {
        throw new Error(res.error || 'No matching order found.');
      }

      setOrder(res.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lookup failed.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !proofRef.trim()) return;

    setProofSubmitting(true);
    setProofSuccess(null);

    try {
      const res = await submitPaymentProofAction({
        orderId: order.orderNumber,
        referenceOrTxid: proofRef.trim(),
      });

      if (res.success) {
        setProofSuccess('Payment proof registered successfully. Our finance team will audit the transaction shortly.');
        setOrder({
          ...order,
          status: 'PAYMENT_SUBMITTED',
          paymentReference: proofRef.trim(),
        });
        setProofRef('');
      } else {
        alert(res.error || 'Failed to submit proof');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProofSubmitting(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-700">DRAFT</span>;
      case 'PENDING_PAYMENT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">Payment instructions provided</span>;
      case 'PAYMENT_SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">Payment under verification</span>;
      case 'PAYMENT_VERIFIED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Payment verified</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">PROCESSING & DISCREET PACKAGING</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-800 border border-purple-200">SHIPPED (IN TRANSIT)</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">DELIVERED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-800 border border-rose-200">CANCELLED</span>;
      case 'REFUNDED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300">REFUNDED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="border-b border-[#E5E3DD] pb-6 space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
          <Link href={`/${locale}`} className="hover:text-[#121212] transition">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${locale}/account`} className="hover:text-[#121212] transition">
            Account
          </Link>
          <span>/</span>
          <span className="text-[#121212] font-medium">Order Status Lookup</span>
        </nav>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212] flex items-center gap-3">
          <Search className="w-8 h-8 text-[#4A5D4E]" />
          Secure Order Status Lookup
        </h1>
        <p className="text-xs sm:text-sm text-[#5C5852] max-w-2xl">
          Check your European order progress, review authoritative payment details, and submit transaction proofs. Dual-factor authentication protects order privacy against unauthorized sequential access.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-6">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                Order Reference Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. FB-EU-2026-10024"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:ring-2 focus:ring-[#4A5D4E]/20 focus:border-[#4A5D4E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                Customer Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="Email used during checkout"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:ring-2 focus:ring-[#4A5D4E]/20 focus:border-[#4A5D4E]"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-[#5C5852] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4A5D4E]" />
              Dual-factor access gate: Sequential probing strictly rejected.
            </span>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
            >
              {loading ? 'Verifying Credentials...' : 'Lookup Order'}
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Order Details Display */}
      {order && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DD] pb-6">
              <div>
                <span className="text-xs font-mono text-[#5C5852]">Order Reference</span>
                <h2 className="text-2xl font-serif font-bold text-[#121212]">{order.orderNumber}</h2>
                <p className="text-xs text-[#5C5852] mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} &bull; Shipping Method:{' '}
                  <strong>{order.shippingMethodCode === 'EXPRESS' ? 'Express European Courier' : 'Standard European Delivery'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(order.status)}
              </div>
            </div>

            {/* Shipment progress banner if shipped */}
            {order.status === 'SHIPPED' && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-5 h-5 text-purple-700 shrink-0" />
                  <div>
                    <span className="font-semibold">Order In Transit</span>
                    {order.trackingNumber ? (
                      <p className="font-mono text-xs text-purple-800 mt-0.5">Shipment Reference: {order.trackingNumber}</p>
                    ) : (
                      <p className="text-xs text-purple-800 mt-0.5">Dispatched from our European facility in plain, neutral parcel</p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-purple-700">100% Odorless Discreet Packaging</div>
              </div>
            )}

            {/* Line Items Snapshot */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#121212] uppercase tracking-wider">Order Items</h3>
              <div className="divide-y divide-[#E5E3DD] border-y border-[#E5E3DD]">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                    <div>
                      <p className="font-medium text-[#121212]">{item.productName}</p>
                      <p className="text-xs text-[#5C5852]">
                        {item.variantName} &bull; SKU: {item.sku} &bull; Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-[#121212]">
                      {order.currency === 'GBP' ? '£' : '€'}
                      {(item.lineTotal / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5 text-xs text-[#5C5852]">
                <h4 className="font-bold text-[#121212] uppercase tracking-wider mb-2">Delivery Address</h4>
                <p>{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</p>
                <p>{order.shippingAddress?.streetAddress}</p>
                <p>{order.shippingAddress?.postalCode} {order.shippingAddress?.city}</p>
                <p className="font-semibold text-[#121212]">{order.shippingAddress?.countryCode}</p>
              </div>

              <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E5E3DD] space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[#5C5852]">
                  <span>Subtotal</span>
                  <span>{order.currency === 'GBP' ? '£' : '€'}{(order.subtotalAmount / 100).toFixed(2)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-[#4A5D4E]">
                    <span>Discount</span>
                    <span>-{order.currency === 'GBP' ? '£' : '€'}{(order.discountAmount / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#5C5852]">
                  <span>Shipping ({order.shippingMethodCode})</span>
                  <span>
                    {order.shippingAmount === 0 ? 'FREE' : `${order.currency === 'GBP' ? '£' : '€'}${(order.shippingAmount / 100).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#121212] border-t border-[#E5E3DD] pt-2">
                  <span>Authoritative Total</span>
                  <span>{order.currency === 'GBP' ? '£' : '€'}{(order.totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Proof Submission Section if order is PENDING_PAYMENT */}
            {order.status === 'PENDING_PAYMENT' && (
              <div className="border-t border-[#E5E3DD] pt-6 space-y-4">
                <div className="flex items-center gap-2 text-[#4A5D4E]">
                  <CreditCard className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-lg text-[#121212]">Submit Payment Proof</h3>
                </div>
                <p className="text-xs text-[#5C5852]">
                  Once you have initiated your SEPA transfer or broadcast your crypto transaction, enter your reference or TXID below for administrative reconciliation.
                </p>

                {proofSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{proofSuccess}</span>
                  </div>
                ) : (
                  <form onSubmit={handleProofSubmit} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Transfer Reference / Bank Memo / Crypto TXID"
                        value={proofRef}
                        onChange={(e) => setProofRef(e.target.value)}
                        required
                        className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:ring-2 focus:ring-[#4A5D4E]/20 focus:border-[#4A5D4E]"
                      />
                      <button
                        type="submit"
                        disabled={proofSubmitting}
                        className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
                      >
                        {proofSubmitting ? 'Registering...' : 'Submit Proof'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Status Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="border-t border-[#E5E3DD] pt-6 space-y-3">
                <h4 className="text-xs font-bold text-[#121212] uppercase tracking-wider">Audit Timeline</h4>
                <div className="space-y-2">
                  {order.statusHistory.map((hist: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-[#5C5852]">
                      <Clock className="w-3.5 h-3.5 text-[#4A5D4E] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#121212]">{hist.toStatus}</span>
                        {hist.note && <span className="ml-1.5">&bull; {hist.note}</span>}
                        <span className="ml-2 text-neutral-400">({new Date(hist.createdAt).toLocaleString()})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
