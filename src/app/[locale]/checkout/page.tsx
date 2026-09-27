'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCommerce } from '@/context/CommerceContext';
import {
  Lock,
  Building2,
  Coins,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { createOrderAction } from '@/actions/orders';
import { submitPaymentProofAction } from '@/actions/payments';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { ShippingService } from '@/domain/shipping/ShippingService';
import {
  applyCryptoDiscountCopy,
  calculateCryptoPaymentDiscount,
  isBankTransferAvailable,
  isCryptocurrencyPayment,
} from '@/domain/payments/CryptoPaymentDiscount';
import { getDictionary } from '@/i18n';
import CryptoDiscountNotice from '@/components/CryptoDiscountNotice';

export default function CheckoutPage() {
  const { cart, subtotal, formatMoney, currency, locale, clearCart } = useCommerce();
  const dict = getDictionary(locale);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    streetAddress: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    countryCode: 'DE',
  });

  const [shippingMethodCode, setShippingMethodCode] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [paymentMethodCode, setPaymentMethodCode] = useState<'SEPA_IBAN' | 'CRYPTO_BTC'>('CRYPTO_BTC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic Server-Authoritative Shipping calculation based on destination country and subtotal
  const shippingCalculation = ShippingService.calculateShipping({
    subtotal,
    currency,
    destinationCountry: formData.countryCode,
    selectedMethodCode: shippingMethodCode,
  });

  const standardOption = shippingCalculation.methods.find((m) => m.code === 'STANDARD');
  const expressOption = shippingCalculation.methods.find((m) => m.code === 'EXPRESS');
  const dynamicShippingCost = shippingCalculation.selectedMethod.cost;
  const bankTransferAvailable = isBankTransferAvailable(subtotal);

  useEffect(() => {
    if (!bankTransferAvailable && paymentMethodCode === 'SEPA_IBAN') {
      setPaymentMethodCode('CRYPTO_BTC');
    }
  }, [bankTransferAvailable, paymentMethodCode]);

  const cryptoDiscount = isCryptocurrencyPayment(paymentMethodCode)
    ? calculateCryptoPaymentDiscount(subtotal)
    : 0;
  const dynamicTotal = Math.max(0, subtotal - cryptoDiscount + dynamicShippingCost);

  // Completed Order State
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderNumber: string;
    totalAmount: number;
    paymentInstructions: any;
    shippingOriginHub: string;
    lookupUrl?: string;
    lookupToken?: string;
  } | null>(null);

  // Payment Proof Submission State
  const [proofReference, setProofReference] = useState('');
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (cart.length === 0) {
        throw new Error('Your cart is empty.');
      }

      const payload = {
        items: cart.map((it) => ({ variantId: it.id, quantity: it.quantity })),
        currency,
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone.trim(),
          streetAddress: formData.streetAddress,
          houseNumber: formData.houseNumber || undefined,
          city: formData.city,
          postalCode: formData.postalCode,
          countryCode: formData.countryCode,
        },
        shippingMethodCode,
        paymentMethodCode,
      };

      const result = await createOrderAction(payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize order.');
      }

      setOrderConfirmed({
        orderNumber: result.data.orderNumber,
        totalAmount: result.data.totalAmount ?? dynamicTotal,
        lookupUrl: result.data.lookupUrl,
        lookupToken: result.data.lookupToken,
        paymentInstructions: result.data.paymentInstructions,
        shippingOriginHub: result.data.shippingOriginHub || 'NL',
      });
      clearCart();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderConfirmed || !proofReference.trim()) return;

    try {
      const res = await submitPaymentProofAction({
        orderId: orderConfirmed.orderNumber,
        referenceOrTxid: proofReference.trim(),
      });
      if (res.success) {
        setProofSubmitted(true);
      } else {
        alert(res.error || 'Proof submission rejected');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // SUCCESS / CONFIRMATION VIEW
  if (orderConfirmed) {
    const inst = orderConfirmed.paymentInstructions;
    const cryptoWallets: Array<{ symbol: string; name: string; network: string; address: string; amount?: string; qrDataUrl?: string }> =
      Array.isArray(inst?.wallets) && inst.wallets.length > 0
        ? inst.wallets
        : inst?.details?.receivingAddress
          ? [
              {
                symbol: 'BTC',
                name: String(inst.details.cryptoName || 'Bitcoin'),
                network: String(inst.details.network || 'Bitcoin'),
                address: String(inst.details.receivingAddress),
              },
            ]
          : [];

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8 animate-fadeIn">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#F0F4F1] border border-[#4A5D4E]/30 flex items-center justify-center text-[#4A5D4E] mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">
            Order Initialized &bull; Awaiting Payment Settlement
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#121212]">
            Order #{orderConfirmed.orderNumber}
          </h1>
          <p className="text-xs text-[#5C5852] max-w-md mx-auto leading-relaxed">
            Your consignment will be prepared at European Logistics Hub{' '}
            <strong className="text-[#121212]">{orderConfirmed.shippingOriginHub}</strong> once payment confirmation is received.
          </p>
        </div>

        {isCryptocurrencyPayment(paymentMethodCode) && (
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-[#121212]">Cryptocurrency addresses</h2>
              </div>
              <span className="font-mono text-sm font-bold text-[#4A5D4E]">
                {formatMoney(orderConfirmed.totalAmount)}
              </span>
            </div>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              Send the exact amount listed for the currency you choose. Each amount already includes the 10% cryptocurrency discount and is converted at the market price when the order was placed. After the transfer is sent, paste the transaction hash (TXID) below.
            </p>
            {cryptoWallets.length > 0 ? (
              <ul className="space-y-3">
                {cryptoWallets.map((wallet) => (
                  <li
                    key={`${wallet.symbol}-${wallet.address}`}
                    className="bg-[#FBFBF9] rounded-xl border border-[#E5E3DD] p-4"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {wallet.qrDataUrl && (
                        <img
                          src={wallet.qrDataUrl}
                          alt={`${wallet.name} payment QR code`}
                          className="w-40 h-40 rounded-lg border border-[#E5E3DD] bg-white"
                        />
                      )}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#121212]">{wallet.name}</p>
                            <p className="text-[11px] text-[#5C5852]">{wallet.network}</p>
                          </div>
                          <span className="text-[11px] font-semibold tracking-wide text-[#4A5D4E]">{wallet.symbol}</span>
                        </div>
                        {wallet.amount ? (
                          <div className="rounded-lg bg-[#F0F4F1] px-3 py-2 space-y-1">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-[#4A5D4E]">Send exactly</p>
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-mono text-base font-bold text-[#121212]">
                                {wallet.amount} {wallet.symbol}
                              </p>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(`${wallet.amount} ${wallet.symbol}`, `${wallet.symbol}-amount`)}
                                className="shrink-0 text-[#4A5D4E] hover:text-[#121212] text-[11px] font-semibold inline-flex items-center gap-1"
                                aria-label={`Copy ${wallet.name} amount`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                                {copiedField === `${wallet.symbol}-amount` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <p className="text-[11px] text-[#5C5852]">{formatMoney(orderConfirmed.totalAmount)}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            The exact {wallet.symbol} amount is unavailable. Do not send funds until it is shown.
                          </p>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <code className="text-xs font-mono text-[#121212] break-all">{wallet.address}</code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet.address, wallet.address)}
                            className="shrink-0 text-[#4A5D4E] hover:text-[#121212] text-[11px] font-semibold inline-flex items-center gap-1"
                            aria-label={`Copy ${wallet.name} address`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedField === wallet.address ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#5C5852] bg-[#FBFBF9] border border-[#E5E3DD] rounded-xl px-4 py-3">
                Payment addresses are not listed yet. Contact the store before sending cryptocurrency.
              </p>
            )}
          </div>
        )}

        {/* Payment Instructions Card */}
        <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E3DD] pb-4">
            <div className="flex items-center gap-2.5">
              {paymentMethodCode === 'SEPA_IBAN' ? (
                <Building2 className="w-5 h-5 text-[#4A5D4E]" />
              ) : (
                <Coins className="w-5 h-5 text-amber-600" />
              )}
              <h2 className="text-base font-bold text-[#121212]">
                {paymentMethodCode === 'SEPA_IBAN' ? 'Bank Transfer (SEPA / IBAN)' : 'Cryptocurrency'}
              </h2>
            </div>
            <span className="font-mono text-base font-bold text-[#4A5D4E]">
              {formatMoney(orderConfirmed.totalAmount)}
            </span>
          </div>
          {isCryptocurrencyPayment(paymentMethodCode) && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {applyCryptoDiscountCopy(dict.payment.cryptoDiscountBody)}
            </p>
          )}

          {paymentMethodCode === 'SEPA_IBAN' ? (
            <div className="space-y-3 text-sm">
              <p className="text-[#121212]">
                Contact the admin for SEPA / IBAN payment details. Quote order <strong className="font-mono">{orderConfirmed.orderNumber}</strong> when you write.
              </p>
              <p className="text-xs text-[#5C5852]">
                Email <a className="underline" href="mailto:sales@fusionbars.eu">sales@fusionbars.eu</a>. Bank account details are not shown on this page.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#5C5852]">
              Use one of the cryptocurrency addresses above, then submit the transaction hash so the payment can be matched to this order.
            </p>
          )}

          {/* Proof Submission Box */}
          <div className="pt-4 border-t border-[#E5E3DD] space-y-3">
            <h3 className="font-bold text-sm text-[#121212]">Confirm Payment Transfer</h3>
            {proofSubmitted ? (
              <div className="p-4 rounded-xl bg-[#F0F4F1] border border-[#4A5D4E]/30 text-xs text-[#4A5D4E] space-y-1">
                <strong className="block font-semibold">Proof Reference Recorded &bull; Status: PAYMENT_SUBMITTED</strong>
                <p className="text-[#5C5852]">
                  Our European finance team will audit the transfer against Hub records and dispatch your parcel.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-3">
                <label className="block text-xs text-[#5C5852]">
                  Enter your bank transfer reference or transaction hash:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={proofReference}
                    onChange={(e) => setProofReference(e.target.value)}
                    placeholder={paymentMethodCode === 'SEPA_IBAN' ? 'e.g. Bank Reference / Sender Name' : 'e.g. Transaction hash (TXID)'}
                    className="flex-1 bg-[#FBFBF9] border border-[#E5E3DD] px-3 py-2 text-xs rounded-lg text-[#121212] outline-none font-mono focus:border-[#4A5D4E]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Submit Proof
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E3DD] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <strong className="block text-[#121212]">Secure Guest Order Status Access</strong>
            <span className="text-[#5C5852]">Save or bookmark this private link to review dispatch updates and order progress:</span>
          </div>
          <Link
            href={orderConfirmed.lookupUrl || `/${locale}/orders/${orderConfirmed.orderNumber}`}
            className="px-3.5 py-1.5 rounded-lg bg-[#4A5D4E] text-white font-medium hover:bg-[#3B4A3E] whitespace-nowrap transition"
          >
            View Order Status &rarr;
          </Link>
        </div>

        <div className="flex justify-between items-center text-xs">
          <Link href={`/${locale}/shop`} className="text-[#4A5D4E] font-semibold hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Shop
          </Link>
          <Link href={`/${locale}/account`} className="text-[#5C5852] hover:text-[#121212]">
            View in Customer Portal &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // EMPTY CART CHECK
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-[#121212]">Your shopping bag is empty</h1>
        <p className="text-xs text-[#5C5852]">Add products to your cart before proceeding to checkout.</p>
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A5D4E] text-white text-xs font-semibold"
        >
          Explore Collection <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // ACTIVE CHECKOUT FORM
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="border-b border-[#E5E3DD] pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852] mb-2">
          <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/cart`} className="hover:text-[#121212] transition">Bag</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#121212] font-medium">Checkout</span>
        </nav>
        <h1 className="font-serif text-3xl font-bold text-[#121212] flex items-center gap-2.5">
          <Lock className="w-6 h-6 text-[#4A5D4E]" /> Secure European Checkout
        </h1>
        <p className="text-xs text-[#5C5852] mt-1">
          Direct Settlement &bull; Discreet Packaging &bull; No Third-Party Card Processors
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Input Sections */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Customer Information */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] border-b border-[#E5E3DD] pb-2">
              1. Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">First Name *</label>
                <input
                  type="text"
                  required
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="e.g. Johannes"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">Last Name *</label>
                <input
                  type="text"
                  required
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="e.g. Müller"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">Email Address (for order receipts) *</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@example.com"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label htmlFor="checkout-phone" className="block text-[#5C5852] mb-1 font-medium">Telephone *</label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  minLength={8}
                  autoComplete="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+49 ..."
                  aria-required="true"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
            </div>
          </div>

          {/* 2. European Shipping Address */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] border-b border-[#E5E3DD] pb-2">
              2. Delivery Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[#5C5852] mb-1 font-medium">Street Name *</label>
                <input
                  type="text"
                  required
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleInputChange}
                  placeholder="e.g. Friedrichstraße"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">House / Unit No.</label>
                <input
                  type="text"
                  name="houseNumber"
                  value={formData.houseNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 42B"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">Postal Code *</label>
                <input
                  type="text"
                  required
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="e.g. 10117"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">City *</label>
                <input
                  type="text"
                  required
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Berlin"
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none focus:border-[#4A5D4E]"
                />
              </div>
              <div>
                <label className="block text-[#5C5852] mb-1 font-medium">Destination Country *</label>
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  className="w-full bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg px-3 py-2 text-[#121212] outline-none font-medium focus:border-[#4A5D4E]"
                >
                  {CountryRegistry.getActiveDestinations().map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code}) &mdash; {c.category === 'EU_MEMBER_STATE' ? 'EU' : c.category === 'UNITED_KINGDOM' ? 'UK' : 'Europe'}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#5C5852] mt-1 block">
                  Authoritative shipping from Hub <strong>{shippingCalculation.fulfilmentHub}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Shipping Tier Selection */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] border-b border-[#E5E3DD] pb-2">
              3. Courier Selection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                  shippingMethodCode === 'STANDARD'
                    ? 'border-[#4A5D4E] bg-[#F0F4F1]/60'
                    : 'border-[#E5E3DD] bg-[#FBFBF9] hover:border-[#121212]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethodCode === 'STANDARD'}
                      onChange={() => setShippingMethodCode('STANDARD')}
                    />
                    <strong className="text-sm text-[#121212]">Standard Discreet Courier</strong>
                  </div>
                  <p className="text-[#5C5852]">2&ndash;4 business days across European network.</p>
                </div>
                <span className="font-mono font-bold text-[#121212]">
                  {standardOption?.isFree ? (
                    <strong className="text-[#4A5D4E]">FREE</strong>
                  ) : (
                    formatMoney(standardOption?.cost || 1500)
                  )}
                </span>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                  shippingMethodCode === 'EXPRESS'
                    ? 'border-[#4A5D4E] bg-[#F0F4F1]/60'
                    : 'border-[#E5E3DD] bg-[#FBFBF9] hover:border-[#121212]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethodCode === 'EXPRESS'}
                      onChange={() => setShippingMethodCode('EXPRESS')}
                    />
                    <strong className="text-sm text-[#121212]">Express Priority Courier</strong>
                  </div>
                  <p className="text-[#5C5852]">1&ndash;2 business days direct hub dispatch.</p>
                </div>
                <span className="font-mono font-bold text-[#121212]">
                  {formatMoney(expressOption?.cost || 2000)}
                </span>
              </label>
            </div>
          </div>

          {/* 4. Payment Method Selection */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E3DD] space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] border-b border-[#E5E3DD] pb-2">
              4. Payment Method
            </h2>
            <CryptoDiscountNotice locale={locale} compact />
            {!bankTransferAvailable && (
              <p className="text-xs text-[#5C5852]">
                Orders under {formatMoney(10000)} can be paid with cryptocurrency. Bank transfer is available from {formatMoney(10000)}.
              </p>
            )}
            <div className="space-y-3 text-xs">
              {bankTransferAvailable && (
              <label
                className={`p-4 rounded-xl border cursor-pointer block transition ${
                  paymentMethodCode === 'SEPA_IBAN'
                    ? 'border-[#4A5D4E] bg-[#F0F4F1]/60'
                    : 'border-[#E5E3DD] bg-[#FBFBF9] hover:border-[#121212]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethodCode === 'SEPA_IBAN'}
                      onChange={() => setPaymentMethodCode('SEPA_IBAN')}
                    />
                    <Building2 className="w-4 h-4 text-[#4A5D4E]" />
                    <strong className="text-sm text-[#121212]">Bank Transfer (SEPA / IBAN)</strong>
                  </div>
                  <span className="text-[11px] text-[#4A5D4E] font-medium font-sans">Zero Fees &bull; Instant Confirmation</span>
                </div>
                <p className="text-[#5C5852] mt-2 pl-6">
                  Direct transfer to our Dutch/German merchant accounts with automated Order Reference reconciliation.
                </p>
              </label>
              )}

              <label
                className={`p-4 rounded-xl border cursor-pointer block transition ${
                  paymentMethodCode === 'CRYPTO_BTC'
                    ? 'border-[#4A5D4E] bg-[#F0F4F1]/60'
                    : 'border-[#E5E3DD] bg-[#FBFBF9] hover:border-[#121212]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethodCode === 'CRYPTO_BTC'}
                      onChange={() => setPaymentMethodCode('CRYPTO_BTC')}
                    />
                    <Coins className="w-4 h-4 text-amber-600" />
                    <strong className="text-sm text-[#121212]">Cryptocurrency</strong>
                  </div>
                  <span className="text-[11px] font-semibold text-white bg-[#121212] rounded-full px-2 py-0.5">
                    {applyCryptoDiscountCopy(dict.payment.cryptoDiscountBadge)}
                  </span>
                </div>
                <p className="text-[#5C5852] mt-2 pl-6">
                  Pay with cryptocurrency and save 10% on the merchandise subtotal. Wallet addresses are shown after you confirm the order.
                </p>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Order Summary Sidebar */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-[#121212] border-b border-[#E5E3DD] pb-3">
              Order Review ({cart.length} Item{cart.length > 1 ? 's' : ''})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-[#E5E3DD]/60 pr-1">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#121212]">{item.name}</span>
                    <p className="text-[11px] text-[#5C5852]">Flavor: {item.flavor} &times; {item.quantity}</p>
                  </div>
                  <span className="font-mono font-semibold text-[#121212]">
                    {formatMoney((currency === 'EUR' ? item.unitPriceEUR : item.unitPriceGBP) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E5E3DD] pt-4 space-y-2 text-xs text-[#5C5852]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-[#121212] font-semibold">{formatMoney(subtotal)}</span>
              </div>
              {cryptoDiscount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>{applyCryptoDiscountCopy(dict.payment.cryptoDiscountLine)}</span>
                  <span className="font-mono font-semibold">−{formatMoney(cryptoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax/VAT</span>
                <span className="font-mono text-[#121212]">Not configured</span>
              </div>
              <div className="flex justify-between">
                <span>European Shipping ({shippingMethodCode})</span>
                <span className="font-mono text-[#121212]">
                  {dynamicShippingCost === 0 ? <strong className="text-[#4A5D4E]">FREE</strong> : formatMoney(dynamicShippingCost)}
                </span>
              </div>
              <div className="border-t border-[#E5E3DD] pt-3 flex justify-between text-base font-bold text-[#121212]">
                <span>Total Amount Due</span>
                <span className="text-[#4A5D4E] font-mono">{formatMoney(dynamicTotal)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F0F4F1] border border-[#4A5D4E]/20 text-[11px] text-[#5C5852] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#121212]">
                <ShieldCheck className="w-4 h-4 text-[#4A5D4E]" />
                <span>Zero Trust Architecture</span>
              </div>
              <p>The server recalculates price, discount, tax, and shipping before the order is saved. Tax treatment is not configured, so no VAT amount is added. No card data is stored.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <span>Authorizing Order...</span>
              ) : (
                <>
                  Place Order &amp; Generate Instructions &bull; {formatMoney(dynamicTotal)}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
