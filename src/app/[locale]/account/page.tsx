'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User,
  ShieldCheck,
  Package,
  MapPin,
  Lock,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Truck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  getCurrentCustomerAction,
  loginCustomerAction,
  registerCustomerAction,
  logoutCustomerAction,
  updateCustomerProfileAction,
  getCustomerAddressesAction,
  saveCustomerAddressAction,
  deleteCustomerAddressAction,
  requestPasswordResetAction,
  confirmPasswordResetAction,
} from '@/actions/customer';
import { getCustomerOrdersAction } from '@/actions/orders';
import { submitPaymentProofAction } from '@/actions/payments';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { LocaleCode, OrderStatus } from '@/types';

export default function AccountPage() {
  const params = useParams();
  const locale = (params.locale as LocaleCode) || 'en';

  // Auth State
  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'auth'>('orders');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Register Form
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCurrency, setRegCurrency] = useState<'EUR' | 'GBP'>('EUR');
  const [regLocale, setRegLocale] = useState<string>(locale);

  // Forgot Password Form
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  // Customer Data
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Address Form Modal / Inline
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    firstName: '',
    lastName: '',
    streetAddress: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    countryCode: 'NL',
    phone: '',
    isDefault: true,
  });

  // Payment Proof Modal in Orders
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<any | null>(null);
  const [proofInput, setProofInput] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);

  // Load customer on mount
  useEffect(() => {
    async function loadCustomer() {
      setLoading(true);
      try {
        const res = await getCurrentCustomerAction();
        if (res.success && res.customer) {
          setCustomer(res.customer);
          loadCustomerData(res.customer.id, res.customer.email);
        } else {
          setActiveTab('auth');
        }
      } catch {
        setActiveTab('auth');
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, []);

  async function loadCustomerData(customerId: string, email: string) {
    setOrdersLoading(true);
    try {
      const [ordersRes, addrRes] = await Promise.all([
        getCustomerOrdersAction(email),
        getCustomerAddressesAction(),
      ]);
      if (ordersRes.success) setOrders(ordersRes.orders || []);
      if (addrRes.success) setAddresses(addrRes.addresses || []);
    } finally {
      setOrdersLoading(false);
    }
  }

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await loginCustomerAction({ email: loginEmail, password: loginPassword });
      if (!res.success || !res.customer) throw new Error(res.error || 'Login failed');
      setCustomer(res.customer);
      setActiveTab('orders');
      loadCustomerData(res.customer.id, res.customer.email);
    } catch (err: any) {
      setAuthError(err.message || 'Login credentials invalid');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await registerCustomerAction({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName,
        lastName: regLastName,
        preferredCurrency: regCurrency,
        preferredLocale: regLocale as any,
      });
      if (!res.success || !res.customer) throw new Error(res.error || 'Registration failed');
      setCustomer(res.customer);
      setActiveTab('orders');
      loadCustomerData(res.customer.id, res.customer.email);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutCustomerAction();
    setCustomer(null);
    setActiveTab('auth');
    setAuthMode('login');
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthSubmitting(true);
    try {
      const res: any = await requestPasswordResetAction({ email: resetEmail });
      if (res.success) {
        setAuthSuccess(res.message || 'Password reset link sent.');
        if (res.resetToken) {
          setResetToken(res.resetToken);
          setResetStep('confirm');
        }
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await confirmPasswordResetAction({ token: resetToken, newPassword });
      if (res.success) {
        setAuthSuccess('Password reset successfully. You may now log in.');
        setAuthMode('login');
        setResetStep('request');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Password reset failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveCustomerAddressAction(newAddress);
      if (res.success && res.address) {
        setAddresses([res.address, ...addresses]);
        setShowAddressForm(false);
        setNewAddress({
          firstName: customer?.firstName || '',
          lastName: customer?.lastName || '',
          streetAddress: '',
          houseNumber: '',
          city: '',
          postalCode: '',
          countryCode: 'NL',
          phone: '',
          isDefault: false,
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Remove this address?')) return;
    const res = await deleteCustomerAddressAction(id);
    if (res.success) {
      setAddresses(addresses.filter((a) => a.id !== id));
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForProof || !proofInput.trim()) return;
    setProofSubmitting(true);
    try {
      const res = await submitPaymentProofAction({
        orderId: selectedOrderForProof.orderNumber,
        referenceOrTxid: proofInput.trim(),
      });
      if (res.success) {
        alert('Payment reference registered. Our European finance team will audit the transfer.');
        setSelectedOrderForProof(null);
        setProofInput('');
        if (customer) loadCustomerData(customer.id, customer.email);
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
      case 'PENDING_PAYMENT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">AWAITING PAYMENT</span>;
      case 'PAYMENT_SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">PROOF SUBMITTED</span>;
      case 'PAYMENT_VERIFIED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">PAYMENT VERIFIED</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">PACKAGING QUEUE</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-800 border border-purple-200">IN TRANSIT</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">DELIVERED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-800 border border-rose-200">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Top Header */}
      <div className="border-b border-[#E5E3DD] pb-6 space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
          <Link href={`/${locale}`} className="hover:text-[#121212] transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#121212] font-medium">Customer Portal</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212] flex items-center gap-3">
              <User className="w-8 h-8 text-[#4A5D4E]" />
              {customer ? `${customer.firstName}’s Account` : 'Customer Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5852] mt-1.5 leading-relaxed">
              Order Lifecycle Tracking &bull; SEPA / Crypto Proofs &bull; Discreet European Delivery
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/orders/lookup`}
              className="text-xs text-[#4A5D4E] hover:text-[#3B4A3E] font-medium flex items-center gap-1.5 transition"
            >
              <span>Guest Order Lookup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {customer && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E3DD] hover:bg-neutral-50 text-[#121212] flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!customer ? (
        /* ================= AUTHENTICATION FORM ================= */
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-6">
          <div className="flex border-b border-[#E5E3DD]">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition ${
                authMode === 'login' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition ${
                authMode === 'register' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
              }`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="lisa@example.eu"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:ring-2 focus:ring-[#4A5D4E]/20"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setAuthError(null); }}
                    className="text-xs text-[#4A5D4E] hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:ring-2 focus:ring-[#4A5D4E]/20"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
              >
                {authSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5E3DD] text-[11px] text-[#5C5852] space-y-1">
                <span className="font-semibold text-[#121212]">Pre-seeded Demo Customer:</span>
                <p>Email: <code className="bg-white px-1 py-0.5 rounded">lisa@example.eu</code></p>
                <p>Password: <code className="bg-white px-1 py-0.5 rounded">CustomerPass2026!</code></p>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                    Preferred Currency
                  </label>
                  <select
                    value={regCurrency}
                    onChange={(e) => setRegCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                    Language
                  </label>
                  <select
                    value={regLocale}
                    onChange={(e) => setRegLocale(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                    <option value="nl">Nederlands</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
              >
                {authSubmitting ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {authMode === 'forgot' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-[#121212]">Password Recovery</h3>
              <p className="text-xs text-[#5C5852]">
                Enter your email address and we will generate an authenticated reset link.
              </p>

              {resetStep === 'request' ? (
                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
                  >
                    {authSubmitting ? 'Requesting...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="w-full text-center text-xs text-[#5C5852] hover:text-[#121212]"
                  >
                    Back to Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetConfirm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                      Reset Token
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-[#E5E3DD]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition disabled:opacity-50"
                  >
                    {authSubmitting ? 'Updating...' : 'Set New Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= AUTHENTICATED DASHBOARD ================= */
        <div className="space-y-8 animate-fadeIn">
          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E5E3DD] gap-6">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'orders' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Order History ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'addresses' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Delivery Addresses ({addresses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'profile' ? 'border-[#4A5D4E] text-[#121212]' : 'border-transparent text-[#5C5852] hover:text-[#121212]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile &amp; Preferences</span>
            </button>
          </div>

          {/* TAB 1: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {ordersLoading ? (
                <div className="p-8 text-center text-sm text-[#5C5852]">Retrieving orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E3DD] space-y-3">
                  <Package className="w-10 h-10 text-[#4A5D4E] mx-auto opacity-40" />
                  <h3 className="font-serif font-bold text-lg text-[#121212]">No Orders Placed Yet</h3>
                  <p className="text-xs text-[#5C5852] max-w-sm mx-auto">
                    Explore our European functional mushroom collection. Complimentary shipping on orders from €300.
                  </p>
                  <Link
                    href={`/${locale}/shop`}
                    className="inline-block px-5 py-2 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition"
                  >
                    Browse Catalogue
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div key={ord.id} className="bg-white p-6 rounded-2xl border border-[#E5E3DD] shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E3DD] pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-serif font-bold text-lg text-[#121212]">{ord.orderNumber}</span>
                            {getStatusBadge(ord.status)}
                          </div>
                          <p className="text-xs text-[#5C5852] mt-0.5">
                            Placed on {new Date(ord.createdAt).toLocaleDateString()} &bull; Hub: <strong>{ord.shippingOriginHub}</strong> &bull; Total:{' '}
                            <strong className="text-[#121212]">{ord.currency === 'GBP' ? '£' : '€'}{(ord.totalAmount / 100).toFixed(2)}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {ord.status === 'PENDING_PAYMENT' && (
                            <button
                              onClick={() => { setSelectedOrderForProof(ord); setProofInput(''); }}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] transition"
                            >
                              Submit Payment Proof
                            </button>
                          )}
                          <Link
                            href={`/${locale}/orders/${ord.orderNumber}`}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E3DD] hover:bg-neutral-50 text-[#121212] flex items-center gap-1"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Items snapshot */}
                      <div className="text-xs text-[#5C5852] space-y-1">
                        {ord.items?.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between py-1">
                            <span>{it.quantity}x {it.productName} ({it.variantName})</span>
                            <span className="font-medium text-[#121212]">{ord.currency === 'GBP' ? '£' : '€'}{(it.lineTotal / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {ord.trackingNumber && (
                        <div className="pt-2 text-xs text-purple-700 bg-purple-50 p-2.5 rounded-lg flex items-center justify-between">
                          <span className="font-mono">Shipment Reference: {ord.trackingNumber} ({ord.carrierName})</span>
                          <span>Discreet Fulfilment</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-serif font-bold text-lg text-[#121212]">Shipping Addresses</h3>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {showAddressForm && (
                <form onSubmit={handleSaveAddress} className="bg-[#FAF9F5] p-6 rounded-2xl border border-[#E5E3DD] space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#121212]">New Delivery Destination</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First Name *"
                      required
                      value={newAddress.firstName}
                      onChange={(e) => setNewAddress({ ...newAddress, firstName: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Last Name *"
                      required
                      value={newAddress.lastName}
                      onChange={(e) => setNewAddress({ ...newAddress, lastName: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Street Address *"
                      required
                      value={newAddress.streetAddress}
                      onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                      className="sm:col-span-2 px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="House / Unit Number"
                      value={newAddress.houseNumber}
                      onChange={(e) => setNewAddress({ ...newAddress, houseNumber: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Postal Code *"
                      required
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="City *"
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    />
                    <select
                      value={newAddress.countryCode}
                      onChange={(e) => setNewAddress({ ...newAddress, countryCode: e.target.value })}
                      className="px-3 py-2 text-sm rounded-lg border border-[#E5E3DD] bg-white"
                    >
                      {CountryRegistry.getAllSupportedCountries().map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="px-4 py-2 text-xs font-medium rounded-lg text-[#5C5852] hover:text-[#121212]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E]"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="bg-white p-5 rounded-xl border border-[#E5E3DD] space-y-2 text-xs text-[#5C5852] relative">
                    {addr.isDefault && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0F4F1] text-[#4A5D4E]">
                        DEFAULT
                      </span>
                    )}
                    <p className="font-bold text-sm text-[#121212]">{addr.firstName} {addr.lastName}</p>
                    <p>{addr.streetAddress} {addr.houseNumber || ''}</p>
                    <p>{addr.postalCode} {addr.city}</p>
                    <p className="font-semibold text-[#121212]">{addr.countryCode}</p>

                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-red-500 transition"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E3DD] space-y-6 max-w-2xl">
              <h3 className="font-serif font-bold text-lg text-[#121212]">Account Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#5C5852]">Full Name</span>
                  <p className="text-sm font-semibold text-[#121212]">{customer.firstName} {customer.lastName}</p>
                </div>
                <div>
                  <span className="text-[#5C5852]">Email</span>
                  <p className="text-sm font-semibold text-[#121212]">{customer.email}</p>
                </div>
                <div>
                  <span className="text-[#5C5852]">Preferred Currency</span>
                  <p className="text-sm font-semibold text-[#121212]">{customer.preferredCurrency}</p>
                </div>
                <div>
                  <span className="text-[#5C5852]">Language Preference</span>
                  <p className="text-sm font-semibold text-[#121212] uppercase">{customer.languageCode}</p>
                </div>
                <div>
                  <span className="text-[#5C5852]">Email Verification</span>
                  <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified European Customer</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E5E3DD] pt-6 flex items-center justify-between">
                <span className="text-xs text-[#5C5852]">Password Protected with Bcrypt (12 rounds)</span>
                <button
                  onClick={() => { setAuthMode('forgot'); setActiveTab('auth'); }}
                  className="text-xs text-[#4A5D4E] hover:underline font-medium"
                >
                  Change Password
                </button>
              </div>
            </div>
          )}

          {/* Payment Proof Submission Drawer / Modal */}
          {selectedOrderForProof && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-md w-full border border-[#E5E3DD] space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif font-bold text-lg text-[#121212]">Submit Payment Proof</h3>
                  <button onClick={() => setSelectedOrderForProof(null)} className="text-neutral-400 hover:text-black">✕</button>
                </div>
                <p className="text-xs text-[#5C5852]">
                  Order: <strong>{selectedOrderForProof.orderNumber}</strong> &bull; Total:{' '}
                  <strong>{selectedOrderForProof.currency === 'GBP' ? '£' : '€'}{(selectedOrderForProof.totalAmount / 100).toFixed(2)}</strong>
                </p>

                <form onSubmit={handleSubmitProof} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                      Bank Transfer Reference / Wire Memo / Crypto TXID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FB-EU-2026-XXXXX or 0x7fa2..."
                      value={proofInput}
                      onChange={(e) => setProofInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E3DD]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForProof(null)}
                      className="px-4 py-2 text-xs text-[#5C5852] hover:text-[#121212]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={proofSubmitting}
                      className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#4A5D4E] text-white hover:bg-[#3B4A3E] disabled:opacity-50"
                    >
                      {proofSubmitting ? 'Registering...' : 'Submit Proof'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
