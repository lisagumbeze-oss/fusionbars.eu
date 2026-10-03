'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Cookie, Settings, Check, X } from 'lucide-react';
import { useCommerce } from '@/context/CommerceContext';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';

export interface ConsentSettings {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const COOKIE_CONSENT_KEY = 'fb_cookie_consent_v1';

export default function CookieConsentBanner() {
  const { locale } = useCommerce();
  const pathname = usePathname();
  const sitsAboveBottomNav = !pathname.includes('/admin') && !pathname.includes('/checkout');
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesAllowed, setPreferencesAllowed] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    // Check if consent has already been granted or set
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        // Show banner after brief delay
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored) as ConsentSettings;
        setPreferencesAllowed(Boolean(parsed.preferences));
        setAnalyticsAllowed(Boolean(parsed.analytics));
        setMarketingAllowed(Boolean(parsed.marketing));
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const saveConsent = (preferences: boolean, analytics: boolean, marketing: boolean) => {
    const settings: ConsentSettings = {
      essential: true,
      preferences,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
      version: 'consent-v1',
    };

    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(settings));
      // Set 1-year cookie for SSR recognition
      document.cookie = `${COOKIE_CONSENT_KEY}=${encodeURIComponent(JSON.stringify(settings))}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('fb:consent-updated', { detail: settings }));
    } catch {
      // Fallback
    }

    setVisible(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent(true, true, true);
  };

  const handleEssentialOnly = () => {
    saveConsent(false, false, false);
  };

  const handleSavePreferences = () => {
    saveConsent(preferencesAllowed, analyticsAllowed, marketingAllowed);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Privacy and Cookie Consent"
      className={`fixed left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fadeIn ${
        sitsAboveBottomNav
          ? 'bottom-[calc(var(--mobile-bottom-nav-height)+1rem+env(safe-area-inset-bottom,0px))] lg:bottom-4'
          : 'bottom-4'
      }`}
    >
      <div className="bg-[#121212]/95 backdrop-blur-md text-[#FBFBF9] p-5 sm:p-6 rounded-2xl border border-neutral-700 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4A5D4E]/30 text-[#88A48D] flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <span>European Privacy &amp; Cookie Consent</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Necessary storage keeps the session and cart working. Preferences, analytics, and marketing stay off unless you allow them. No analytics provider is configured.
            </p>
          </div>
        </div>

        {/* Detailed Preferences Panel */}
        {showPreferences && (
          <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <strong className="block text-neutral-200">Necessary</strong>
                <span className="text-[11px] text-neutral-400">Session and cart storage used to operate checkout</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#88A48D] px-2 py-0.5 rounded bg-[#4A5D4E]/20">
                Always Active
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <strong className="block text-neutral-200">Preferences</strong>
                <span className="text-[11px] text-neutral-400">Currency and wishlist stored in this browser</span>
              </div>
              <input
                type="checkbox"
                checked={preferencesAllowed}
                onChange={(e) => setPreferencesAllowed(e.target.checked)}
                className="w-4 h-4 accent-[#4A5D4E] rounded cursor-pointer"
                aria-label="Allow preference storage"
              />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <strong className="block text-neutral-200">Analytics</strong>
                <span className="text-[11px] text-neutral-400">No analytics provider is configured. This choice does not load a tracker.</span>
              </div>
              <input
                type="checkbox"
                checked={analyticsAllowed}
                onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                className="w-4 h-4 accent-[#4A5D4E] rounded cursor-pointer"
                aria-label="Allow Performance and Diagnostics cookies"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <strong className="block text-neutral-200">Marketing &amp; Announcements</strong>
                <span className="text-[11px] text-neutral-400">No marketing tracker is configured. Newsletter delivery is separate and not active.</span>
              </div>
              <input
                type="checkbox"
                checked={marketingAllowed}
                onChange={(e) => setMarketingAllowed(e.target.checked)}
                className="w-4 h-4 accent-[#4A5D4E] rounded cursor-pointer"
                aria-label="Allow Marketing cookies"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 text-xs">
          {!showPreferences ? (
            <>
              <button
                onClick={handleAcceptAll}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-semibold transition cursor-pointer"
              >
                Accept All
              </button>
              <button
                onClick={handleEssentialOnly}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold transition cursor-pointer"
              >
                Essential Only
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="p-2 text-neutral-400 hover:text-white transition flex items-center justify-center cursor-pointer"
                aria-label="Open cookie preferences modal"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSavePreferences}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-semibold transition cursor-pointer"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="w-full sm:w-auto py-2 px-3 text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                Back
              </button>
            </>
          )}
        </div>

        <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-800">
          <span>Optional categories are not required to use the site.</span>
          {LegalGovernanceService.active('cookies', 'en') ? (
            <Link href={`/${locale}/legal/cookies`} className="underline hover:text-neutral-300">Cookie policy</Link>
          ) : (
            <span>Cookie policy is not published.</span>
          )}
        </div>
      </div>
    </aside>
  );
}
