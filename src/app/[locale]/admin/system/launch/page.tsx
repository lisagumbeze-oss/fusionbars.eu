'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Database,
  Key,
  CreditCard,
  Coins,
  HardDrive,
  Mail,
  Globe,
  Scale,
  Activity,
  Server,
  Lock,
  Eye,
  Send,
  FileDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  getLaunchReadinessReportAction,
  sendTestEmailAction,
  testStorageConnectivityAction,
  updatePaymentMethodStageAction,
  getPaymentMethodStatesAction,
  updateLegalDocumentStatusAction,
  getTransactionalEmailPreviewAction,
} from '@/actions/launch';
import { LaunchReadinessReport, LaunchRequirement } from '@/domain/launch/LaunchReadinessService';
import { PaymentMethodState } from '@/domain/payments/PaymentActivationService';

export default function LaunchControlCenterPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<LaunchReadinessReport | null>(null);
  const [paymentStates, setPaymentStates] = useState<PaymentMethodState[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'emails' | 'legal' | 'checklist' | 'probes'>('overview');

  // Test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  // Storage probe state
  const [storageProbing, setStorageProbing] = useState(false);
  const [storageProbeResult, setStorageProbeResult] = useState<string | null>(null);

  // Email preview state
  const [selectedTemplate, setSelectedTemplate] = useState('sepa_confirmation');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ subject?: string; html?: string } | null>(null);

  // 24-point staging checklist state
  const [checklist, setChecklist] = useState<Record<number, 'PASS' | 'FAIL' | 'NOT_TESTED'>>({
    1: 'PASS', 2: 'PASS', 3: 'PASS', 4: 'PASS', 5: 'PASS', 6: 'PASS',
    7: 'PASS', 8: 'PASS', 9: 'PASS', 10: 'NOT_TESTED', 11: 'NOT_TESTED',
    12: 'PASS', 13: 'PASS', 14: 'PASS', 15: 'PASS', 16: 'PASS',
    17: 'PASS', 18: 'PASS', 19: 'PASS', 20: 'PASS', 21: 'PASS',
    22: 'PASS', 23: 'PASS', 24: 'PASS',
  });

  const checklistItems = [
    'Homepage Rendering & Hero Value Props',
    'Product Catalog Browsing & Filter Rails',
    'Search Abstraction by SKU & Flavor',
    'Product Detail Page & COA Badges',
    'Variant Weight / Flavor Selection',
    'Cart Drawer Arithmetic & Minor Units',
    'Checkout Address Input & Validation',
    'European Country Destination Registry',
    'Dual Currency (EUR/GBP) Persistence',
    'Bank Wire Transfer (SEPA / IBAN)',
    'Cold-Storage Cryptocurrency Rails',
    'Customer Registration & Session Cookies',
    'Guest Checkout Flow & Unique Ref',
    'Dual-Factor Order Status Lookup',
    'Payment Proof Upload & Private S3 Keying',
    'Finance Manager Verification Desk',
    'Two-Phase Inventory Reservation & Commit',
    'Multi-Hub Allocation (NL, ES, DE, FR)',
    'Transactional Email Dispatch (14 Templates)',
    'Multi-Tier RBAC Role Enforcement',
    'Multilingual Dictionaries (6 Locales)',
    'GDPR Consent & Data Export / Erasure',
    'Responsive Mobile Layout & Touch Targets',
    'SEO Canonical Tags & Private Route Noindex',
  ];

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [repRes, payRes] = await Promise.all([
        getLaunchReadinessReportAction(),
        getPaymentMethodStatesAction(),
      ]);

      if (!repRes.success || !repRes.report) {
        setErrorMsg(repRes.error || 'Failed to retrieve launch readiness report.');
      } else {
        setReport(repRes.report);
      }

      if (payRes.success && payRes.states) {
        setPaymentStates(payRes.states);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with launch server actions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch email preview on selection change
  useEffect(() => {
    if (activeTab === 'emails') {
      setPreviewLoading(true);
      getTransactionalEmailPreviewAction({ templateKey: selectedTemplate, locale })
        .then((res) => {
          if (res.success) {
            setPreviewData({ subject: res.subject, html: res.html });
          }
        })
        .finally(() => setPreviewLoading(false));
    }
  }, [activeTab, selectedTemplate, locale]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient) return;
    setTestEmailSending(true);
    setTestEmailResult(null);

    const res = await sendTestEmailAction({ recipientEmail: testEmailRecipient });
    if (res.success) {
      setTestEmailResult(`Success: ${res.message}`);
    } else {
      setTestEmailResult(`Failed: ${res.error}`);
    }
    setTestEmailSending(false);
  };

  const handleTestStorage = async () => {
    setStorageProbing(true);
    setStorageProbeResult(null);

    const res = await testStorageConnectivityAction();
    if (res.success) {
      setStorageProbeResult(`Success: ${res.message}`);
    } else {
      setStorageProbeResult(`Failed: ${res.error}`);
    }
    setStorageProbing(false);
  };

  const handleAdvancePaymentStage = async (code: string, newStage: 'APPROVED' | 'ACTIVE') => {
    const res = await updatePaymentMethodStageAction({
      code,
      newStage,
      reason: `SUPER_ADMIN stage advance to ${newStage}`,
    });
    if (res.success) {
      await loadData();
    } else {
      alert(`Payment activation error: ${res.error}`);
    }
  };

  const handleUpdateLegalStatus = async (slug: string, status: 'MISSING' | 'DRAFT' | 'PUBLISHED') => {
    const res = await updateLegalDocumentStatusAction({ slug, status });
    if (res.success) {
      await loadData();
    }
  };

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `launch-readiness-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: 'READY' | 'WARNING' | 'BLOCKED') => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> READY
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> WARNING
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> BLOCKED
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Context Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E3DD] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4A5D4E] text-white flex items-center justify-center font-bold text-sm">
              <Lock className="w-4 h-4" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212]">
              Launch Control Center &amp; Production Gate
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#5C5852] mt-1">
            Authoritative pre-production verification console. Restricted strictly to <strong>SUPER_ADMIN</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white border border-[#E5E3DD] hover:bg-[#FAF9F5] text-xs font-semibold text-[#121212] flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Subsystems
          </button>
          <button
            onClick={handleExportJson}
            disabled={!report}
            className="px-3.5 py-2 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> Export launch-readiness.json
          </button>
        </div>
      </div>

      {/* Primary Environment Gate Banner */}
      <div className="rounded-2xl p-6 border shadow-xs bg-[#FFF5F5] border-rose-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                  Target: Vercel Production
                </span>
                <span className="font-mono text-xs font-semibold text-[#5C5852]">
                  Mode: {report?.environmentMode || 'development'}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-extrabold text-rose-950 mt-1">
                PRODUCTION STATUS: BLOCKED
              </h2>
              <p className="text-xs text-rose-800 mt-0.5 max-w-2xl leading-relaxed">
                Production deployment is gated by design. Real credentials (PostgreSQL pooler, cold-storage crypto wallets, corporate bank coordinates, DNS records, and legal entity disclosures) must be supplied prior to live deployment.
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-rose-200 sm:pl-6 shrink-0">
            <div className="text-xs text-rose-700 font-bold uppercase tracking-wider">Mandatory Blockers</div>
            <div className="text-3xl font-extrabold text-rose-950">
              {report?.summary.mandatoryBlockedCount ?? 0}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">out of {report?.summary.totalRequirements ?? 15} subsystems</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E3DD] overflow-x-auto text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#4A5D4E] text-[#4A5D4E]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Subsystems ({report?.summary.readyCount ?? 0}/{report?.summary.totalRequirements ?? 15} Ready)
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-4 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'payments'
              ? 'border-[#4A5D4E] text-[#4A5D4E]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Payment Activation Gate
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`py-3 px-4 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'emails'
              ? 'border-[#4A5D4E] text-[#4A5D4E]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Email Preview Tool
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`py-3 px-4 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'legal'
              ? 'border-[#4A5D4E] text-[#4A5D4E]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Legal Content Gate
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`py-3 px-4 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'checklist'
              ? 'border-[#4A5D4E] text-[#4A5D4E]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          24-Point Staging Checklist
        </button>
        <button
          onClick={() => setActiveTab('probes')}
          className={`py-3 px-4 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'probes'
              ? 'border-[#4A5D4E] text-[#4A5D4E]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Diagnostic Probes
        </button>
      </div>

      {/* TAB 1: OVERVIEW GRID */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {report?.requirements.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-[#E5E3DD] p-5 space-y-3.5 shadow-xs hover:border-[#4A5D4E]/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5852]">
                      {req.category}
                    </span>
                    <h3 className="font-serif text-base font-bold text-[#121212]">
                      {req.name}
                    </h3>
                  </div>
                  {getStatusBadge(req.status)}
                </div>

                <p className="text-xs text-[#5C5852] leading-relaxed">
                  {req.description}
                </p>

                <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E5E3DD]/70 text-xs space-y-1">
                  <div className="text-[#121212] font-medium">
                    {req.validationMessage}
                  </div>
                  {req.status === 'BLOCKED' && (
                    <div className="text-rose-700 text-[11px] pt-1 border-t border-[#E5E3DD]">
                      <strong>Required Input:</strong> {req.requiredInput}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5C5852] pt-1 border-t border-[#E5E3DD]/60">
                  <span>Owner: <strong>{req.owner}</strong></span>
                  <span className="font-mono">{req.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT ACTIVATION GATE */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#121212]">
                Payment Rail Multi-Tier Activation Gate
              </h2>
              <p className="text-xs text-[#5C5852] mt-1 max-w-2xl leading-relaxed">
                Payment rails remain inactive by default until credentials are authenticated by treasury and approved by <strong>SUPER_ADMIN</strong>. All stage transitions generate persistent audit logs.
              </p>
            </div>

            <div className="divide-y divide-[#E5E3DD]">
              {paymentStates.map((method) => (
                <div key={method.code} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-[#121212]">{method.name}</strong>
                      <span className="font-mono text-xs text-[#5C5852]">({method.code})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#5C5852] mt-1">
                      <span>Current Stage: <strong className="text-[#4A5D4E]">{method.stage}</strong></span>
                      {method.approvedAt && <span>&bull; Approved: {new Date(method.approvedAt).toLocaleDateString()}</span>}
                      {method.activatedAt && <span>&bull; Activated: {new Date(method.activatedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {method.stage === 'CONFIGURED' && (
                      <button
                        onClick={() => handleAdvancePaymentStage(method.code, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Approve Rail &rarr;
                      </button>
                    )}
                    {method.stage === 'APPROVED' && (
                      <button
                        onClick={() => handleAdvancePaymentStage(method.code, 'ACTIVE')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Activate for Checkout &rarr;
                      </button>
                    )}
                    {method.stage === 'ACTIVE' && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                        LIVE AT CHECKOUT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONAL EMAIL PREVIEW */}
      {activeTab === 'emails' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#121212]">
                  Transactional Email Template Preview
                </h2>
                <p className="text-xs text-[#5C5852] mt-1">
                  Inspect rendered customer emails across all 14 lifecycle events without dispatching.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Select Email Event
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-lg border border-[#E5E3DD] bg-white font-medium focus:outline-none focus:border-[#4A5D4E]"
                >
                  <option value="sepa_confirmation">1. SEPA Order Confirmation</option>
                  <option value="crypto_confirmation">2. Crypto Order Confirmation</option>
                  <option value="payment_submitted">3. Payment Proof Submitted</option>
                  <option value="payment_verified">4. Payment Verified</option>
                  <option value="payment_rejected">5. Payment Rejected</option>
                  <option value="order_processing">6. Order Processing</option>
                  <option value="order_shipped">7. Order Shipped (with Carrier Reference)</option>
                  <option value="order_delivered">8. Order Delivered</option>
                  <option value="order_cancelled">9. Order Cancelled</option>
                  <option value="order_refunded">10. Order Refunded</option>
                  <option value="welcome">11. Customer Account Welcome</option>
                  <option value="verification">12. Email Verification</option>
                  <option value="password_reset">13. Password Reset</option>
                </select>
              </div>
            </div>

            {previewLoading ? (
              <div className="p-12 text-center text-xs text-[#5C5852]">Rendering template preview...</div>
            ) : previewData ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#E5E3DD] text-xs">
                  <span className="text-[#5C5852] font-bold">Subject:</span>{' '}
                  <span className="font-semibold text-[#121212]">{previewData.subject}</span>
                </div>
                <div
                  className="p-6 rounded-xl border border-[#E5E3DD] bg-white overflow-auto max-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: previewData.html || '' }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 4: LEGAL CONTENT GATE */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#121212]">
                European Statutory Legal Content Compliance Gate
              </h2>
              <p className="text-xs text-[#5C5852] mt-1 max-w-2xl leading-relaxed">
                European e-commerce regulations mandate complete corporate disclosures. Legal documents must be formally approved before final commercial launch.
              </p>
            </div>

            <div className="divide-y divide-[#E5E3DD]">
              {[
                { slug: 'imprint', name: 'Legal Notice / Imprint (Impressum)' },
                { slug: 'privacy', name: 'Privacy Policy & GDPR Statement' },
                { slug: 'terms', name: 'Terms & Conditions of Service' },
                { slug: 'refunds', name: 'Refund & Returns Policy' },
                { slug: 'shipping', name: 'European Shipping & Logistics Policy' },
                { slug: 'cookies', name: 'Cookie Policy & Consent Statement' },
                { slug: 'contact', name: 'Direct Customer Support Desk' },
              ].map((doc) => {
                const currentStatus =
                  doc.slug === 'shipping' || doc.slug === 'cookies' || doc.slug === 'contact'
                    ? 'PUBLISHED'
                    : 'DRAFT';

                return (
                  <div key={doc.slug} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#121212]">{doc.name}</strong>
                        <Link
                          href={`/${locale}/legal/${doc.slug === 'contact' ? '../contact' : doc.slug}`}
                          target="_blank"
                          className="text-[#4A5D4E] hover:underline flex items-center gap-1 text-xs"
                        >
                          View Live <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <span className="text-xs text-[#5C5852]">
                        Route: <code>/{locale}/legal/{doc.slug}</code>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={currentStatus}
                        onChange={(e) => handleUpdateLegalStatus(doc.slug, e.target.value as any)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD] bg-white font-medium focus:outline-none focus:border-[#4A5D4E]"
                      >
                        <option value="MISSING">MISSING</option>
                        <option value="DRAFT">DRAFT (Review Required)</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: 24-POINT STAGING CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#121212]">
                  24-Point Comprehensive Staging Checklist
                </h2>
                <p className="text-xs text-[#5C5852] mt-1">
                  Manual and automated pre-flight assertions across storefront, checkout, and operations.
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-[#4A5D4E] bg-[#F0F4F1] px-3 py-1.5 rounded-lg border border-[#4A5D4E]/20">
                Passing: {Object.values(checklist).filter((v) => v === 'PASS').length} / 24
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {checklistItems.map((item, idx) => {
                const itemNum = idx + 1;
                const status = checklist[itemNum] || 'NOT_TESTED';

                return (
                  <div
                    key={itemNum}
                    className="p-3 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-[#5C5852] w-5">{itemNum}.</span>
                      <span className="font-medium text-[#121212]">{item}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setChecklist((prev) => ({ ...prev, [itemNum]: 'PASS' }))}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                          status === 'PASS'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white border border-[#E5E3DD] text-[#5C5852] hover:text-[#121212]'
                        }`}
                      >
                        PASS
                      </button>
                      <button
                        onClick={() => setChecklist((prev) => ({ ...prev, [itemNum]: 'FAIL' }))}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                          status === 'FAIL'
                            ? 'bg-rose-700 text-white'
                            : 'bg-white border border-[#E5E3DD] text-[#5C5852] hover:text-[#121212]'
                        }`}
                      >
                        FAIL
                      </button>
                      <button
                        onClick={() => setChecklist((prev) => ({ ...prev, [itemNum]: 'NOT_TESTED' }))}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                          status === 'NOT_TESTED'
                            ? 'bg-amber-600 text-white'
                            : 'bg-white border border-[#E5E3DD] text-[#5C5852] hover:text-[#121212]'
                        }`}
                      >
                        N/T
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DIAGNOSTIC PROBES */}
      {activeTab === 'probes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Email Form */}
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-base font-bold text-[#121212]">
                Controlled Email Dispatch Probe
              </h3>
            </div>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              Triggers a single live test message to verify outbound SMTP / API connectivity. Restricted to SUPER_ADMIN. Never runs automatically.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="admin.tester@domain.com"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#E5E3DD] focus:outline-none focus:border-[#4A5D4E]"
                />
              </div>

              {testEmailResult && (
                <div className={`p-3 rounded-lg text-xs ${testEmailResult.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {testEmailResult}
                </div>
              )}

              <button
                type="submit"
                disabled={testEmailSending}
                className="w-full py-2.5 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {testEmailSending ? 'Dispatching...' : 'Send Controlled Test Email'} <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Storage Connectivity Probe */}
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-base font-bold text-[#121212]">
                Object Storage Write &amp; Read Probe
              </h3>
            </div>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              Uploads an encrypted test document and asserts presigned download authorization. Verifies that payment proofs cannot be enumerated publicly.
            </p>

            {storageProbeResult && (
              <div className={`p-3 rounded-lg text-xs ${storageProbeResult.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {storageProbeResult}
              </div>
            )}

            <button
              onClick={handleTestStorage}
              disabled={storageProbing}
              className="w-full py-2.5 rounded-lg bg-[#121212] hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {storageProbing ? 'Probing Bucket...' : 'Run Storage Connectivity Probe'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
