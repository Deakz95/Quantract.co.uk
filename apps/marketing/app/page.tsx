"use client";

import { useState } from "react";
import { PricingCalculator } from "./components/PricingCalculator";
import {
  FileText,
  Receipt,
  Briefcase,
  ScrollText,
  Users,
  Building2,
  Menu,
  X,
  CheckCircle,
  Star,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Phone,
  Mail,
} from "lucide-react";

// FAQ data
const faqs = [
  {
    q: "What's a \"solo company\"?",
    a: "A solo company is simply a group of one. You get the same features as larger organisations - just scaled for your needs. Start with Core and grow as your business grows.",
  },
  {
    q: "What is Multi-Entity Billing?",
    a: "If you operate multiple limited companies (LTDs) under one parent group, Multi-Entity Billing lets you manage them all from one account. Each entity has its own invoice numbering, certificates, and branding.",
  },
  {
    q: "What happens if I exceed my limits?",
    a: "We'll notify you before you hit your limits. You can upgrade your plan, add modules, or contact us about Enterprise options. We never cut you off mid-month.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle. Add modules as you need them.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! Every new account gets a 14-day free trial with full access to all features. No credit card required to start.",
  },
  {
    q: "Do you integrate with accounting software?",
    a: "Yes, we integrate with Xero for seamless invoice syncing. More integrations coming soon.",
  },
];

// Feature icons mapping
const featureIcons = {
  quotes: FileText,
  jobs: Briefcase,
  invoicing: Receipt,
  certificates: ScrollText,
  portal: Users,
  multiEntity: Building2,
};

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Skip to content link - Accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container nav-inner">
          <a href="/" className="nav-logo" aria-label="Quantract home">
            Quantract
          </a>

          {/* Desktop nav */}
          <div className="nav-links nav-links-desktop">
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <a href="https://crm.quantract.co.uk/admin/login" className="nav-link">Sign In</a>
            <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">
              Start Free Trial
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`mobile-menu ${mobileMenuOpen ? "mobile-menu-open" : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <a href="#features" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            Features
          </a>
          <a href="#pricing" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            Pricing
          </a>
          <a href="#faq" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            FAQ
          </a>
          <a href="https://crm.quantract.co.uk/admin/login" className="mobile-menu-link">
            Sign In
          </a>
          <a
            href="https://crm.quantract.co.uk/auth/sign-up"
            className="btn btn-primary mobile-menu-cta"
          >
            Start Free Trial
          </a>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className="hero-badge">
              <Zap size={14} />
              <span>New: Multi-Entity Billing</span>
            </div>
            <h1>Cut Admin Time by 5 Hours a Week</h1>
            <p className="hero-subtitle">
              Quotes, jobs, invoices, and certificates - all in one place.
              Built specifically for UK electrical contractors who&apos;d rather be on site than behind a desk.
            </p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start 14-Day Free Trial
              </a>
              <a href="#pricing" className="btn btn-secondary btn-lg">
                View Pricing
              </a>
            </div>
            <p className="hero-trust">
              <CheckCircle size={16} className="hero-trust-icon" />
              <span>No credit card required</span>
              <span className="hero-trust-divider">•</span>
              <span>Cancel anytime</span>
              <span className="hero-trust-divider">•</span>
              <span>UK-based support</span>
            </p>
          </div>
        </section>

        {/* Social Proof */}
        <section className="social-proof">
          <div className="container">
            <div className="trust-badges">
              <div className="trust-badge">
                <Shield size={20} />
                <span>GDPR Compliant</span>
              </div>
              <div className="trust-badge">
                <Star size={20} />
                <span>BS 7671 Compliant Certs</span>
              </div>
              <div className="trust-badge">
                <Clock size={20} />
                <span>UK-Based Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features">
          <div className="container">
            <div className="section-header">
              <h2>Everything You Need to Run Your Business</h2>
              <p>From quoting to getting paid, Quantract handles your entire workflow.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <FileText size={24} />
                </div>
                <h3>Professional Quotes</h3>
                <p>Create branded quotes in minutes. Send for digital signature and convert to jobs automatically.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Briefcase size={24} />
                </div>
                <h3>Job Management</h3>
                <p>Track jobs from start to finish. Assign engineers, manage stages, and monitor progress in real-time.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Receipt size={24} />
                </div>
                <h3>Invoicing &amp; Payments</h3>
                <p>Generate invoices, send reminders, and get paid online. Xero integration included.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <ScrollText size={24} />
                </div>
                <h3>Digital Certificates</h3>
                <p>EICR, EIC, Minor Works and more. Create, sign and issue certificates digitally.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Users size={24} />
                </div>
                <h3>Customer Portal</h3>
                <p>Let clients view quotes, sign agreements, pay invoices and access certificates online.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Building2 size={24} />
                </div>
                <h3>Multi-Entity Billing</h3>
                <p>Run multiple LTDs under one account. Separate invoicing, certificates and numbering per entity.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pricing">
          <div className="container">
            <div className="section-header">
              <h2>Simple, Transparent Pricing</h2>
              <p>
                Start with Core and add modules as you need them, or get everything with Pro.
                Solo company? You&apos;re a group of one - same great features.
              </p>
            </div>

            {/* Main pricing cards */}
            <div className="pricing-cards">
              {/* Core */}
              <div className="pricing-card">
                <h3>Quantract Core</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">19</span>
                  <span className="period">/month</span>
                </div>
                <p className="description">
                  The foundation for your business. Add modules to extend functionality.
                </p>
                <ul className="features-list">
                  <li>1 organisation/tenant</li>
                  <li>Custom subdomain</li>
                  <li>3 users included (£4/extra)</li>
                  <li>1 legal entity included</li>
                  <li>1 service line</li>
                  <li>Basic dashboard &amp; reports</li>
                  <li>Quote management</li>
                  <li>Client management</li>
                </ul>
                <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-secondary">
                  Start Free Trial
                </a>
              </div>

              {/* Pro Bundle */}
              <div className="pricing-card featured">
                <h3>Quantract Pro</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">79</span>
                  <span className="period">/month</span>
                </div>
                <p className="description">
                  Everything included. Best value for growing businesses.
                </p>
                <ul className="features-list">
                  <li><strong>All Core features</strong></li>
                  <li><strong>CRM Module</strong> - Jobs &amp; Invoicing</li>
                  <li><strong>Certificates Module</strong> - Digital certs</li>
                  <li><strong>Customer Portal</strong></li>
                  <li><strong>Tools Pack</strong></li>
                  <li>10 users included (£3/extra)</li>
                  <li>2 legal entities included</li>
                  <li>500 invoices/month</li>
                  <li>300 certificates/month</li>
                  <li>100GB storage</li>
                </ul>
                <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">
                  Start Free Trial
                </a>
              </div>
            </div>

            {/* Modules & Add-ons */}
            <div className="modules">
              <div className="modules-header">
                <h3>
                  <span aria-hidden="true">📦</span> Modules (add to Core)
                </h3>
              </div>
              <div className="modules-grid">
                <div className="module-card">
                  <h4>CRM Module</h4>
                  <div className="module-price">£19/month</div>
                  <p>Jobs, invoicing, variations. Includes 300 invoices/month.</p>
                </div>
                <div className="module-card">
                  <h4>Certificates Module</h4>
                  <div className="module-price">£15/month</div>
                  <p>EICR, EIC, Minor Works, Fire Alarms. Includes 150 certs/month.</p>
                </div>
                <div className="module-card">
                  <h4>Customer Portal</h4>
                  <div className="module-price">£7/month</div>
                  <p>Client login, quote signing, invoice payments, cert access.</p>
                </div>
                <div className="module-card">
                  <h4>Tools Pack</h4>
                  <div className="module-price">£7/month</div>
                  <p>Cable calculator, point counter, and professional tools.</p>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div className="modules" style={{ marginTop: "2rem" }}>
              <div className="modules-header">
                <h3>
                  <span aria-hidden="true">➕</span> Add-ons
                </h3>
              </div>
              <div className="modules-grid">
                <div className="module-card module-card-highlight">
                  <h4>Multi-Entity Billing</h4>
                  <div className="module-price">£15/entity/month</div>
                  <p><strong>For groups with multiple LTDs.</strong> Separate invoicing, certificates, and number sequences per entity. 1 entity included in Core, 2 in Pro.</p>
                </div>
                <div className="module-card">
                  <h4>Extra Storage</h4>
                  <div className="module-price">£5/50GB/month</div>
                  <p>Additional file storage for documents, photos, and PDFs.</p>
                </div>
                <div className="module-card">
                  <h4>SMS Notifications</h4>
                  <div className="module-price">From £0.10/SMS</div>
                  <p>Send appointment reminders and notifications via SMS.</p>
                </div>
              </div>
            </div>

            {/* Calculator */}
            <PricingCalculator />
          </div>
        </section>

        {/* Enterprise */}
        <section className="enterprise">
          <div className="container">
            <div className="enterprise-inner">
              <div>
                <h2>Enterprise</h2>
                <p>
                  Custom solutions for larger organisations with advanced requirements.
                  Dedicated infrastructure, SSO, and priority support.
                </p>
                <ul className="enterprise-triggers">
                  <li>50+ users</li>
                  <li>5+ legal entities</li>
                  <li>2,000+ invoices/month</li>
                  <li>1,000+ certificates/month</li>
                  <li>SSO/SAML required</li>
                  <li>Audit log retention</li>
                  <li>Dedicated database</li>
                  <li>Custom integrations</li>
                </ul>
              </div>
              <div className="enterprise-cta">
                <div className="enterprise-price">
                  From £299<span>/month</span>
                </div>
                <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>Custom pricing based on requirements</p>
                <a href="mailto:enterprise@quantract.co.uk" className="btn btn-primary btn-lg">
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="faq">
          <div className="container">
            <div className="section-header">
              <h2>Frequently Asked Questions</h2>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-item-accordion">
                  <button
                    className="faq-question"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span>{faq.q}</span>
                    {openFaq === index ? (
                      <ChevronUp size={20} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={20} aria-hidden="true" />
                    )}
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    className={`faq-answer ${openFaq === index ? "faq-answer-open" : ""}`}
                    aria-hidden={openFaq !== index}
                  >
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="final-cta">
          <div className="container">
            <h2>Ready to Save Time on Admin?</h2>
            <p>Join hundreds of electrical contractors who&apos;ve streamlined their business with Quantract.</p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Your Free Trial
              </a>
              <a href="mailto:hello@quantract.co.uk" className="btn btn-secondary btn-lg">
                <Mail size={18} />
                Get in Touch
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="footer-logo">Quantract</span>
              <p className="footer-tagline">Professional software for electrical contractors</p>
              <div className="footer-contact">
                <a href="mailto:hello@quantract.co.uk">
                  <Mail size={16} /> hello@quantract.co.uk
                </a>
              </div>
            </div>
            <div className="footer-links-group">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="https://crm.quantract.co.uk/auth/sign-up">Free Trial</a></li>
              </ul>
            </div>
            <div className="footer-links-group">
              <h4>Company</h4>
              <ul>
                <li><a href="mailto:hello@quantract.co.uk">Contact</a></li>
                <li><a href="mailto:support@quantract.co.uk">Support</a></li>
              </ul>
            </div>
            <div className="footer-links-group">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">
              &copy; {new Date().getFullYear()} Quantract Ltd. All rights reserved.
            </p>
            <p className="footer-legal">
              Registered in England &amp; Wales
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
