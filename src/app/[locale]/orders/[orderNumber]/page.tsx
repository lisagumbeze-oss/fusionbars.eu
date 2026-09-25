'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Package,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { lookupOrderAction } from '@/actions/orders';
import { submitPaymentProofAction } from '@/actions/payments';
import { LocaleCode, OrderStatus } from '@/types';

export default function OrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as LocaleCode) || 'en';
  const orderNumber = params.orderNumber as string;
  const token = searchParams.get('token') || undefined;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [proofRef, setProofRef] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofSuccess, setProofSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const res = await lookupOrderAction({
          orderNumber,
          token,
        });

        if (res.success && res.order) {
          setOrder(res.order);
        } else {
          setErrorMsg(res.error || 'Authentication required to access order details.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to retrieve order.');
      } finally {
        setLoading(false);
      }
    }

    if (orderNumber) {
      fetchOrder();
    }
  }, [orderNumber, token]);

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
        setProofSuccess('Payment reference logged. Awaiting financial confirmation.');
        setOrder({
          ...order,
          status: 'PAYMENT_SUBMITTED',
          paymentReference: proofRef.trim(),
        });
        setProofRef('');
      } else {
        alert(res.error || 'Submission failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProofSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <Link
        href={`/${locale}/orders/lookup`}
        className="inline-flex items-center gap-1.5 text-xs text-[#5C5852] hover:text-[#121212] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Order Status Lookup</span>
      </Link>

      {loading && (
        <div className="p-12 text-center text-sm text-[#5C5852] bg-white rounded-2xl border border-[#E5E3DD]">
          Verifying security credentials and retrieving order record...
        </div>
      )}

      {errorMsg && !loading && (
        <div className="p-6 rounded-2xl bg-white border border-red-200 space-y-4">
          <div className="flex items-center gap-2.5 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <h2 className="font-serif font-bold text-lg">Protected Order Record</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#5C5852]">
            {errorMsg} If you are looking up a guest order, please enter your email address on the order status portal to verify ownership.
          </p>
          <Link
            href={`/${locale}/orders/lookup`}
            className="inline-block px-5 py-2 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition"
          >
            Go to Secure Order Status Lookup
          </Link>
        </div>
      )}

      {order && !loading && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DD] pb-6">
            <div>
              <span className="text-xs font-mono text-[#5C5852]">European Commerce Record</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#121212]">{order.orderNumber}</h1>
              <p className="text-xs text-[#5C5852] mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString()} &bull; Discreet Packaging
              </p>
            </div>

            <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              STATUS: {order.status}
            </span>
          </div>

          {/* Shipment progress banner if shipped */}
          {order.status === 'SHIPPED' && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-purple-700 shrink-0" />
                <div>
                  <span className="font-semibold">Order In Transit</span>
                  {order.trackingNumber ? (
                    <p className="font-mono text-xs text-purple-800">Shipment Reference: {order.trackingNumber}</p>
                  ) : (
                    <p className="text-xs text-purple-800">Dispatched from our European facility in plain, neutral parcel</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-purple-700">Discreet Delivery</span>
            </div>
          )}

          {/* Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#121212] uppercase tracking-wider">Ordered Products</h3>
            <div className="divide-y divide-[#E5E3DD] border-y border-[#E5E3DD]">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <p className="font-medium text-[#121212]">{item.productName}</p>
                    <p className="text-xs text-[#5C5852]">{item.variantName} &bull; Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium">
                    {order.currency === 'GBP' ? '£' : '€'}{(item.lineTotal / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Proof submission if pending */}
          {order.status === 'PENDING_PAYMENT' && (
            <div className="border-t border-[#E5E3DD] pt-6 space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#121212] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#4A5D4E]" />
                Submit Payment Reference
              </h3>
              {proofSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{proofSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleProofSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter SEPA Reference or Crypto TXID"
                    value={proofRef}
                    onChange={(e) => setProofRef(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD]"
                  />
                  <button
                    type="submit"
                    disabled={proofSubmitting}
                    className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
                  >
                    {proofSubmitting ? 'Submitting...' : 'Confirm Payment Proof'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
