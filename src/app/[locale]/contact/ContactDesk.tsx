'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Mail, Clock, MapPin, ShieldCheck, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { LocaleCode } from '@/types';
import { submitContactInquiryAction } from '@/actions/contact';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { STORE_ADDRESS, UK_BRANCH_OFFICE } from '@/lib/store-address';

export default function ContactDesk() {
  const params = useParams();
  const locale = (params.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Order / Consignment Status');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const result = await submitContactInquiryAction({
        name,
        email,
        subjectCategory: subject,
        message,
        locale,
      });

      if (!result?.success) {
        setErrorMsg(result?.error || 'Failed to send inquiry.');
        setSubmitting(false);
        return;
      }

      setSubmittedMessage(result.message || 'Your message was sent. A confirmation is on its way to you and to sales@fusionbars.eu.');
      setSubmitted(true);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'The message was not sent. You can email sales@fusionbars.eu directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="border-b border-[#E5E3DD] pb-8 space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
          <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#121212] font-medium">Customer Support</span>
        </nav>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212]">
          European Customer Support &amp; Inquiries
        </h1>
        <p className="text-xs sm:text-sm text-[#5C5852] max-w-2xl leading-relaxed">
          Direct communication desk for order reconciliations, collective allocations, and botanical batch specifications. Where can I buy Fusion Bars in Ireland is this shop. Write here if the question is about an order, a flavour, or a delivery to Ireland or another European address checkout accepts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-7 bg-white rounded-2xl border border-[#E5E3DD] p-6 sm:p-8 space-y-6 shadow-xs">
          {submitted ? (
            <div role="status" className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#121212]">Message sent</h2>
              <p className="text-sm text-[#121212] max-w-sm mx-auto leading-relaxed">
                {submittedMessage}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSubmittedMessage('');
                  setMessage('');
                }}
                className="text-xs text-[#4A5D4E] font-semibold hover:underline cursor-pointer"
              >
                Send Another Message &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:border-[#4A5D4E]"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:border-[#4A5D4E]"
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Subject Category
                </label>
                <select
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] bg-white focus:outline-none focus:border-[#4A5D4E]"
                >
                  <option value="Order / Consignment Status">Order / Consignment Status</option>
                  <option value="Payment Proof Reconciliation">Payment Proof Reconciliation</option>
                  <option value="Collective / Wholesale Allocation (50-100 Boxes)">Collective / Wholesale Allocation (50-100 Boxes)</option>
                  <option value="Laboratory COA & Product Inquiry">Laboratory COA &amp; Product Inquiry</option>
                  <option value="Privacy / GDPR Rights Request">Privacy / GDPR Rights Request</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1">
                  Message Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  minLength={10}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry (include Order Reference Number if applicable)..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E5E3DD] focus:outline-none focus:border-[#4A5D4E]"
                />
              </div>

              {errorMsg && (
                <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Transmitting...' : 'Dispatch Message'} <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        <div className="md:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#4A5D4E]" /> Addresses
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C5852]">Store</p>
                <address className="mt-1 text-sm text-[#121212] leading-relaxed not-italic">
                  {STORE_ADDRESS.lines.map((line) => (
                    <span key={line} className="block">{line}</span>
                  ))}
                </address>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C5852]">{UK_BRANCH_OFFICE.label}</p>
                <address className="mt-1 text-sm text-[#121212] leading-relaxed not-italic">
                  {UK_BRANCH_OFFICE.lines.map((line) => (
                    <span key={line} className="block">{line}</span>
                  ))}
                </address>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4A5D4E]" /> Electronic Mail
            </h2>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              For general client support, bank proof submissions, and laboratory certificates:
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="font-mono text-sm font-bold text-[#4A5D4E] hover:underline block"
            >
              {supportEmail}
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-bold text-[#121212] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4A5D4E]" /> Operating Schedule
            </h2>
            <div className="text-xs text-[#5C5852] space-y-1.5 leading-relaxed">
              <p><strong>Monday &ndash; Friday:</strong> 09:00 &ndash; 18:00 CET</p>
              <p><strong>Saturday:</strong> 10:00 &ndash; 14:00 CET</p>
              <p><strong>Sunday:</strong> Automated Logistics Processing</p>
            </div>
          </div>

          <div className="bg-[#F0F4F1] rounded-2xl border border-[#4A5D4E]/20 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4A5D4E] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Discretion Guarantee
            </div>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              All client communications are strictly confidential. Inquiries are handled exclusively by verified European operations personnel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
