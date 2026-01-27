"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const CONSENT_KEY = "quantract_cookie_consent";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

// Initialize Google Analytics (called only when user has consented)
function initializeAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (gaId && typeof window !== "undefined" && !window.gtag) {
    // Load GA script dynamically
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", gaId, {
      anonymize_ip: true, // GDPR compliance
    });

    // Make gtag available globally
    window.gtag = gtag;
  }
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: "",
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Check for existing consent in localStorage
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent) as ConsentState;
        // Update consent state for preferences modal
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading from localStorage on mount is valid
        setConsent(parsed);
        // Initialize analytics if previously consented
        if (parsed.analytics) {
          initializeAnalytics();
        }
      } catch {
        // Invalid stored consent, show banner
        setShowBanner(true);
      }
    } else {
      // No stored consent, show banner after delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const saveConsent = (newConsent: ConsentState) => {
    const consentWithTimestamp = {
      ...newConsent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setConsent(consentWithTimestamp);
    setShowBanner(false);
    setShowPreferences(false);

    // Initialize analytics if consented
    if (newConsent.analytics) {
      initializeAnalytics();
    }
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: "",
    });
  };

  const acceptNecessaryOnly = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: "",
    });
  };

  const savePreferences = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div
        className="cookie-banner"
        role="dialog"
        aria-label="Cookie consent"
        aria-describedby="cookie-description"
      >
        <div className="cookie-banner-content">
          <p id="cookie-description">
            We use cookies to improve your experience and analyse site usage.
            By clicking &quot;Accept All&quot;, you consent to our use of cookies.
            See our <Link href="/privacy">Privacy Policy</Link> for details.
          </p>
          <div className="cookie-banner-actions">
            <button
              onClick={() => setShowPreferences(true)}
              className="btn btn-ghost"
            >
              Manage Preferences
            </button>
            <button onClick={acceptNecessaryOnly} className="btn btn-secondary">
              Necessary Only
            </button>
            <button onClick={acceptAll} className="btn btn-primary">
              Accept All
            </button>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div
          className="cookie-modal-overlay"
          onClick={() => setShowPreferences(false)}
        >
          <div
            className="cookie-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Cookie preferences"
          >
            <h3>Cookie Preferences</h3>
            <p>
              Choose which cookies you want to accept. Your preferences will be
              saved for future visits.
            </p>

            <div className="cookie-options">
              <div className="cookie-option">
                <div className="cookie-option-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={consent.necessary}
                      disabled
                    />
                    <strong>Necessary</strong>
                  </label>
                  <span className="cookie-badge">Always On</span>
                </div>
                <p>
                  Required for the website to function. Cannot be disabled.
                </p>
              </div>

              <div className="cookie-option">
                <div className="cookie-option-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={(e) =>
                        setConsent({ ...consent, analytics: e.target.checked })
                      }
                    />
                    <strong>Analytics</strong>
                  </label>
                </div>
                <p>
                  Help us understand how visitors use our site to improve the
                  experience. Data is anonymised.
                </p>
              </div>

              <div className="cookie-option">
                <div className="cookie-option-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) =>
                        setConsent({ ...consent, marketing: e.target.checked })
                      }
                    />
                    <strong>Marketing</strong>
                  </label>
                </div>
                <p>
                  Allow us to show you relevant ads and track campaign
                  effectiveness.
                </p>
              </div>
            </div>

            <div className="cookie-modal-actions">
              <button
                onClick={() => setShowPreferences(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={savePreferences} className="btn btn-primary">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Extend window for gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
