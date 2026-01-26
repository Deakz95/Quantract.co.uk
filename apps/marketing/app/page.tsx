import { PricingCalculator } from "./components/PricingCalculator";

export default function HomePage() {
  return (
    <>
      {/* Navigation */}
      <nav className="nav">
        <div className="container nav-inner">
          <a href="/" className="nav-logo">Quantract</a>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="https://crm.quantract.co.uk/admin/login" className="nav-link">Sign In</a>
            <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">Start Free Trial</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <span>New: Multi-Entity Billing</span>
          </div>
          <h1>Professional Software for<br />Electrical Contractors</h1>
          <p className="hero-subtitle">
            Quotes, jobs, invoices, certificates and customer portals.
            One platform for solo contractors and multi-company groups alike.
          </p>
          <div className="hero-buttons">
            <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
              Start 14-Day Free Trial
            </a>
            <a href="#pricing" className="btn btn-secondary btn-lg">
              View Pricing
            </a>
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
              <div className="feature-icon">📝</div>
              <h3>Professional Quotes</h3>
              <p>Create branded quotes in minutes. Send for digital signature and convert to jobs automatically.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Job Management</h3>
              <p>Track jobs from start to finish. Assign engineers, manage stages, and monitor progress in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💷</div>
              <h3>Invoicing & Payments</h3>
              <p>Generate invoices, send reminders, and get paid online. Xero integration included.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📜</div>
              <h3>Digital Certificates</h3>
              <p>EICR, EIC, Minor Works and more. Create, sign and issue certificates digitally.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Customer Portal</h3>
              <p>Let clients view quotes, sign agreements, pay invoices and access certificates online.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
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
                <li>Basic dashboard & reports</li>
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
                <li><strong>CRM Module</strong> - Jobs & Invoicing</li>
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
                <span>📦</span> Modules (add to Core)
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
                <span>➕</span> Add-ons
              </h3>
            </div>
            <div className="modules-grid">
              <div className="module-card" style={{ borderColor: "var(--primary)", borderWidth: "2px" }}>
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
      <section className="faq">
        <div className="container">
          <div className="section-header">
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>What&apos;s a &quot;solo company&quot;?</h4>
              <p>A solo company is simply a group of one. You get the same features as larger organisations - just scaled for your needs. Start with Core and grow as your business grows.</p>
            </div>
            <div className="faq-item">
              <h4>What is Multi-Entity Billing?</h4>
              <p>If you operate multiple limited companies (LTDs) under one parent group, Multi-Entity Billing lets you manage them all from one account. Each entity has its own invoice numbering, certificates, and branding.</p>
            </div>
            <div className="faq-item">
              <h4>What happens if I exceed my limits?</h4>
              <p>We&apos;ll notify you before you hit your limits. You can upgrade your plan, add modules, or contact us about Enterprise options. We never cut you off mid-month.</p>
            </div>
            <div className="faq-item">
              <h4>Can I change plans later?</h4>
              <p>Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle. Add modules as you need them.</p>
            </div>
            <div className="faq-item">
              <h4>Is there a free trial?</h4>
              <p>Yes! Every new account gets a 14-day free trial with full access to all features. No credit card required to start.</p>
            </div>
            <div className="faq-item">
              <h4>Do you integrate with accounting software?</h4>
              <p>Yes, we integrate with Xero for seamless invoice syncing. More integrations coming soon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-links">
            <a href="mailto:support@quantract.co.uk">Support</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
          <p className="footer-copy">&copy; {new Date().getFullYear()} Quantract. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
