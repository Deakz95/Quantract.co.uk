"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  CheckCircle,
  ArrowRight,
  Shield,
  HelpCircle,
  Mail,
  Phone,
} from "lucide-react";

// Pricing constants
const PRICING = {
  core: {
    base: 19,
    includedUsers: 3,
    extraUserPrice: 4,
    includedEntities: 1,
  },
  modules: {
    crm: { price: 19, label: "CRM Module", description: "Jobs & Invoicing", included: "300 invoices/month" },
    certificates: { price: 15, label: "Certificates", description: "Digital certificates", included: "150 certs/month" },
    portal: { price: 7, label: "Customer Portal", description: "Client self-service", included: "Unlimited clients" },
    tools: { price: 7, label: "Tools Pack", description: "Cable calc & more", included: "All tools" },
  },
  addons: {
    extraEntity: 15,
    storageBlock: 5,
  },
  pro: {
    base: 79,
    includedUsers: 10,
    includedEntities: 2,
    extraUserPrice: 3,
    extraEntityPrice: 15,
  },
};

const faqs = [
  {
    q: "What's included in the free trial?",
    a: "Everything. You get full access to all Pro features for 14 days. No credit card required. If you don't upgrade, your account simply expires - no charges, no hassle.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, anytime. Upgrade or downgrade whenever you need. Changes take effect on your next billing cycle. Add or remove modules as your business changes.",
  },
  {
    q: "How does billing work?",
    a: "Monthly billing via credit/debit card. Invoices are generated automatically and sent to your email. All prices exclude VAT which is added at checkout.",
  },
  {
    q: "What happens if I cancel?",
    a: "Cancel anytime from your account settings. You keep access until the end of your billing period. We'll give you time to export your data. No cancellation fees ever.",
  },
  {
    q: "What if I exceed my limits?",
    a: "We'll notify you before you hit limits. You can upgrade, add capacity, or we can discuss Enterprise options. We never cut you off mid-month.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Not yet, but it's coming soon. Monthly billing keeps things flexible while you're getting started.",
  },
];

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usePro, setUsePro] = useState(true);
  const [users, setUsers] = useState(5);
  const [entities, setEntities] = useState(1);
  const [modules, setModules] = useState({
    crm: true,
    certificates: true,
    portal: false,
    tools: false,
  });

  const calculation = useMemo(() => {
    const breakdown: { name: string; price: number }[] = [];
    let total = 0;

    if (usePro) {
      breakdown.push({ name: "Quantract Pro", price: PRICING.pro.base });
      total += PRICING.pro.base;
      const extraUsers = Math.max(0, users - PRICING.pro.includedUsers);
      if (extraUsers > 0) {
        const userCost = extraUsers * PRICING.pro.extraUserPrice;
        breakdown.push({ name: `Extra users (${extraUsers} × £${PRICING.pro.extraUserPrice})`, price: userCost });
        total += userCost;
      }
      const extraEntities = Math.max(0, entities - PRICING.pro.includedEntities);
      if (extraEntities > 0) {
        const entityCost = extraEntities * PRICING.pro.extraEntityPrice;
        breakdown.push({ name: `Extra entities (${extraEntities} × £${PRICING.pro.extraEntityPrice})`, price: entityCost });
        total += entityCost;
      }
    } else {
      breakdown.push({ name: "Quantract Core", price: PRICING.core.base });
      total += PRICING.core.base;
      const extraUsers = Math.max(0, users - PRICING.core.includedUsers);
      if (extraUsers > 0) {
        const userCost = extraUsers * PRICING.core.extraUserPrice;
        breakdown.push({ name: `Extra users (${extraUsers} × £${PRICING.core.extraUserPrice})`, price: userCost });
        total += userCost;
      }
      if (modules.crm) {
        breakdown.push({ name: "CRM Module", price: PRICING.modules.crm.price });
        total += PRICING.modules.crm.price;
      }
      if (modules.certificates) {
        breakdown.push({ name: "Certificates Module", price: PRICING.modules.certificates.price });
        total += PRICING.modules.certificates.price;
      }
      if (modules.portal) {
        breakdown.push({ name: "Customer Portal", price: PRICING.modules.portal.price });
        total += PRICING.modules.portal.price;
      }
      if (modules.tools) {
        breakdown.push({ name: "Tools Pack", price: PRICING.modules.tools.price });
        total += PRICING.modules.tools.price;
      }
      const extraEntities = Math.max(0, entities - PRICING.core.includedEntities);
      if (extraEntities > 0) {
        const entityCost = extraEntities * PRICING.addons.extraEntity;
        breakdown.push({ name: `Multi-Entity (${extraEntities} extra)`, price: entityCost });
        total += entityCost;
      }
    }

    return { breakdown, total };
  }, [usePro, users, entities, modules]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo" aria-label="Quantract home">Quantract</Link>
          <div className="nav-links nav-links-desktop">
            <Link href="/features" className="nav-link">Features</Link>
            <Link href="/pricing" className="nav-link nav-link-active">Pricing</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/contact" className="nav-link">Contact</Link>
            <a href="https://crm.quantract.co.uk/admin/login" className="nav-link">Sign In</a>
            <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">Try Free for 14 Days</a>
          </div>
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
        <div id="mobile-menu" className={`mobile-menu ${mobileMenuOpen ? "mobile-menu-open" : ""}`} aria-hidden={!mobileMenuOpen}>
          <Link href="/features" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link href="/pricing" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link href="/about" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link href="/contact" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          <a href="https://crm.quantract.co.uk/admin/login" className="mobile-menu-link">Sign In</a>
          <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary mobile-menu-cta">Try Free for 14 Days</a>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="page-hero">
          <div className="container">
            <h1>Simple, Honest Pricing</h1>
            <p className="page-hero-subtitle">
              No hidden fees. No long contracts. Cancel anytime.<br />
              All prices exclude VAT.
            </p>
          </div>
        </section>

        {/* Main Pricing Cards */}
        <section className="pricing-section">
          <div className="container">
            <div className="pricing-cards pricing-cards-3col">
              {/* Core */}
              <div className="pricing-card">
                <h3>Quantract Core</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">19</span>
                  <span className="period">/month</span>
                </div>
                <p className="price-note">+ VAT</p>
                <p className="description">Start here and add modules as you need them.</p>
                <ul className="features-list">
                  <li>Quote management</li>
                  <li>Client database</li>
                  <li>Custom subdomain</li>
                  <li>3 users included</li>
                  <li>1 legal entity</li>
                  <li>Basic reports</li>
                  <li>Email support</li>
                </ul>
                <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-secondary">Start Free Trial</a>
              </div>

              {/* Pro */}
              <div className="pricing-card featured">
                <div className="recommended-badge">Recommended</div>
                <h3>Quantract Pro</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">79</span>
                  <span className="period">/month</span>
                </div>
                <p className="price-note">+ VAT · Save £9/month vs modules</p>
                <p className="description">Everything included. Best value for growing teams.</p>
                <ul className="features-list">
                  <li><strong>All Core features</strong></li>
                  <li><strong>Jobs &amp; Invoicing</strong> - 500/month</li>
                  <li><strong>Digital Certificates</strong> - 300/month</li>
                  <li><strong>Customer Portal</strong></li>
                  <li><strong>Tools Pack</strong></li>
                  <li>10 users included</li>
                  <li>2 legal entities</li>
                  <li>100GB storage</li>
                  <li>Priority support</li>
                </ul>
                <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">Start Free Trial</a>
              </div>

              {/* Enterprise */}
              <div className="pricing-card pricing-card-dark">
                <h3>Enterprise</h3>
                <div className="price">
                  <span className="amount" style={{ fontSize: "1.5rem" }}>Custom</span>
                </div>
                <p className="price-note">From £299/month</p>
                <p className="description">For larger organisations with advanced needs.</p>
                <ul className="features-list">
                  <li>50+ users</li>
                  <li>5+ legal entities</li>
                  <li>2,000+ invoices/month</li>
                  <li>1,000+ certificates/month</li>
                  <li>SSO / SAML</li>
                  <li>Dedicated database</li>
                  <li>Audit log retention</li>
                  <li>Custom integrations</li>
                  <li>Dedicated account manager</li>
                </ul>
                <Link href="/contact" className="btn btn-secondary">Contact Sales</Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className="pricing-trust">
              <div className="pricing-trust-item">
                <Shield size={20} />
                <span>14-day free trial</span>
              </div>
              <div className="pricing-trust-item">
                <CheckCircle size={20} />
                <span>No credit card required</span>
              </div>
              <div className="pricing-trust-item">
                <CheckCircle size={20} />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section className="modules-section">
          <div className="container">
            <div className="section-header">
              <h2>Add Modules to Core</h2>
              <p>Start with Core and add what you need, when you need it.</p>
            </div>
            <div className="modules-grid-pricing">
              <div className="module-card-pricing">
                <h4>CRM Module</h4>
                <div className="module-price">£19<span>/month</span></div>
                <p>Jobs, invoicing, variations, payment tracking.</p>
                <div className="module-includes">Includes 300 invoices/month</div>
              </div>
              <div className="module-card-pricing">
                <h4>Certificates Module</h4>
                <div className="module-price">£15<span>/month</span></div>
                <p>EICR, EIC, Minor Works, Fire Alarms. BS 7671 compliant.</p>
                <div className="module-includes">Includes 150 certificates/month</div>
              </div>
              <div className="module-card-pricing">
                <h4>Customer Portal</h4>
                <div className="module-price">£7<span>/month</span></div>
                <p>Client login, quote signing, invoice payments, cert access.</p>
                <div className="module-includes">Unlimited clients</div>
              </div>
              <div className="module-card-pricing">
                <h4>Tools Pack</h4>
                <div className="module-price">£7<span>/month</span></div>
                <p>Cable calculator, point counter, and professional tools.</p>
                <div className="module-includes">All tools included</div>
              </div>
            </div>
          </div>
        </section>

        {/* Add-ons Section */}
        <section className="addons-section">
          <div className="container">
            <div className="section-header">
              <h2>Add-ons</h2>
              <p>Extra capacity when you need it.</p>
            </div>
            <div className="addons-grid">
              <div className="addon-card">
                <h4>Extra Users</h4>
                <div className="addon-price">£4/user/month <span>(Core)</span></div>
                <div className="addon-price">£3/user/month <span>(Pro)</span></div>
              </div>
              <div className="addon-card">
                <h4>Multi-Entity Billing</h4>
                <div className="addon-price">£15/entity/month</div>
                <p>Run multiple LTDs with separate invoicing and certificates.</p>
              </div>
              <div className="addon-card">
                <h4>Extra Storage</h4>
                <div className="addon-price">£5/50GB/month</div>
              </div>
              <div className="addon-card">
                <h4>SMS Notifications</h4>
                <div className="addon-price">From £0.10/SMS</div>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="calculator-section">
          <div className="container">
            <div className="calculator">
              <h3>Estimate Your Monthly Cost</h3>
              <div className="calculator-grid">
                <div className="calculator-inputs">
                  <div className="calc-row" style={{ background: usePro ? "rgba(22, 163, 74, 0.1)" : undefined }}>
                    <label>Use Pro Bundle (Recommended)</label>
                    <div className="calc-toggle">
                      <input type="checkbox" checked={usePro} onChange={(e) => setUsePro(e.target.checked)} />
                    </div>
                  </div>
                  <div className="calc-row">
                    <label>
                      Users
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                        {usePro ? "10 included, £3/extra" : "3 included, £4/extra"}
                      </span>
                    </label>
                    <input type="number" min={1} max={100} value={users} onChange={(e) => setUsers(Math.max(1, parseInt(e.target.value) || 1))} />
                  </div>
                  <div className="calc-row">
                    <label>
                      Legal Entities
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                        {usePro ? "2 included" : "1 included"}, £15/extra
                      </span>
                    </label>
                    <input type="number" min={1} max={20} value={entities} onChange={(e) => setEntities(Math.max(1, parseInt(e.target.value) || 1))} />
                  </div>
                  {!usePro && (
                    <>
                      <div className="calc-row">
                        <label>CRM Module <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Jobs & Invoicing</span></label>
                        <div className="calc-toggle">
                          <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£19/mo</span>
                          <input type="checkbox" checked={modules.crm} onChange={(e) => setModules({ ...modules, crm: e.target.checked })} />
                        </div>
                      </div>
                      <div className="calc-row">
                        <label>Certificates Module <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Digital certificates</span></label>
                        <div className="calc-toggle">
                          <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£15/mo</span>
                          <input type="checkbox" checked={modules.certificates} onChange={(e) => setModules({ ...modules, certificates: e.target.checked })} />
                        </div>
                      </div>
                      <div className="calc-row">
                        <label>Customer Portal <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Client self-service</span></label>
                        <div className="calc-toggle">
                          <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£7/mo</span>
                          <input type="checkbox" checked={modules.portal} onChange={(e) => setModules({ ...modules, portal: e.target.checked })} />
                        </div>
                      </div>
                      <div className="calc-row">
                        <label>Tools Pack <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Cable calc & more</span></label>
                        <div className="calc-toggle">
                          <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>£7/mo</span>
                          <input type="checkbox" checked={modules.tools} onChange={(e) => setModules({ ...modules, tools: e.target.checked })} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="calculator-result">
                  <div className="result-total">
                    <div className="label">Estimated Monthly Total</div>
                    <div className="amount">£{calculation.total}</div>
                    <div className="period">/month + VAT</div>
                  </div>
                  <ul className="result-breakdown">
                    {calculation.breakdown.map((item, i) => (
                      <li key={i}>
                        <span className="item-name">{item.name}</span>
                        <span className="item-price">£{item.price}</span>
                      </li>
                    ))}
                  </ul>
                  {usePro && (
                    <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>
                      Includes: 500 invoices/mo, 300 certificates/mo, 100GB storage
                    </p>
                  )}
                  <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary" style={{ width: "100%", marginTop: "1.5rem" }}>
                    Start Free Trial <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq">
          <div className="container">
            <div className="section-header">
              <h2>Pricing Questions</h2>
            </div>
            <div className="faq-grid">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-card">
                  <h4><HelpCircle size={18} /> {faq.q}</h4>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
            <div className="faq-footer">
              <p>Have another question? <Link href="/contact">Get in touch</Link> - we reply within 24 hours.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="final-cta">
          <div className="container">
            <h2>Ready to Get Started?</h2>
            <p>14-day free trial. Full access. No credit card required.</p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Free Trial <ArrowRight size={18} />
              </a>
              <Link href="/contact" className="btn btn-secondary btn-lg">
                <Phone size={18} /> Book a Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="footer-logo">Quantract</span>
              <p className="footer-tagline">Job management software built for UK electrical contractors.</p>
              <div className="footer-contact">
                <a href="mailto:hello@quantract.co.uk"><Mail size={16} /> hello@quantract.co.uk</a>
              </div>
            </div>
            <div className="footer-links-group">
              <h4>Product</h4>
              <ul>
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><a href="https://crm.quantract.co.uk/auth/sign-up">Free Trial</a></li>
              </ul>
            </div>
            <div className="footer-links-group">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><a href="mailto:support@quantract.co.uk">Support</a></li>
              </ul>
            </div>
            <div className="footer-links-group">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">&copy; {new Date().getFullYear()} Quantract Ltd. All rights reserved.</p>
            <p className="footer-legal">Registered in England &amp; Wales</p>
          </div>
        </div>
      </footer>
    </>
  );
}
