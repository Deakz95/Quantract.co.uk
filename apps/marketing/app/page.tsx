"use client";

import { useState } from "react";
import Link from "next/link";
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
  ArrowRight,
  Quote,
  Play,
  PoundSterling,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { testimonials, getInitials } from "../src/data/testimonials";

// FAQ data
const faqs = [
  {
    q: "Do I need to be tech-savvy to use Quantract?",
    a: "Not at all. If you can use a smartphone, you can use Quantract. Most users are creating quotes within 15 minutes of signing up. We also have UK-based support if you get stuck.",
  },
  {
    q: "What certificates can I create?",
    a: "EICR, EIC, Minor Works (including Fire Alarms), and more. All fully BS 7671 compliant with digital signatures and PDF generation. Your clients can access them instantly via the portal.",
  },
  {
    q: "Can I try it before I commit?",
    a: "Yes - every account gets a 14-day free trial with full access to all features. No credit card required. Cancel anytime, no questions asked.",
  },
  {
    q: "How does pricing work?",
    a: "Start with Core at £19/month and add modules as you need them, or get everything with Pro at £79/month. All prices exclude VAT. You can upgrade, downgrade, or cancel anytime.",
  },
  {
    q: "What if I have multiple companies?",
    a: "Multi-Entity Billing lets you run multiple LTDs from one account. Each entity has its own invoice numbering, certificates, and branding. Ideal for group structures.",
  },
  {
    q: "Do you integrate with Xero?",
    a: "Yes, invoices sync automatically to Xero. No double entry, no mistakes. More integrations (Sage, QuickBooks) coming soon.",
  },
];

// Stats for social proof
const stats = [
  { value: "5+", label: "Hours saved weekly", icon: Clock },
  { value: "40%", label: "Faster payments", icon: PoundSterling },
  { value: "Same-day", label: "Certificate delivery", icon: Calendar },
  { value: "Zero", label: "Paper forms needed", icon: FileText },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Skip to content link - Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Navigation */}
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo" aria-label="Quantract home">
            Quantract
          </Link>

          {/* Desktop nav */}
          <div className="nav-links nav-links-desktop">
            <Link href="/features" className="nav-link">Features</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/contact" className="nav-link">Contact</Link>
            <a href="https://crm.quantract.co.uk/admin/login" className="nav-link">Sign In</a>
            <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">
              Try Free for 14 Days
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
          <Link href="/features" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            Features
          </Link>
          <Link href="/pricing" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            Pricing
          </Link>
          <Link href="/about" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            About
          </Link>
          <Link href="/contact" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            Contact
          </Link>
          <a href="https://crm.quantract.co.uk/admin/login" className="mobile-menu-link">
            Sign In
          </a>
          <a
            href="https://crm.quantract.co.uk/auth/sign-up"
            className="btn btn-primary mobile-menu-cta"
          >
            Try Free for 14 Days
          </a>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className="hero-badge">
              <Zap size={14} />
              <span>Built for UK Electrical Contractors</span>
            </div>
            <h1>Stop Doing Admin at 10pm</h1>
            <p className="hero-subtitle">
              Quotes, jobs, invoices, and BS 7671 certificates - sorted in minutes, not hours.
              Get back to the work that actually pays.
            </p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Your Free Trial
                <ArrowRight size={18} />
              </a>
              <Link href="/pricing" className="btn btn-secondary btn-lg">
                See Pricing
              </Link>
            </div>
            <p className="hero-trust">
              <CheckCircle size={16} className="hero-trust-icon" />
              <span>No credit card required</span>
              <span className="hero-trust-divider">•</span>
              <span>Cancel anytime</span>
              <span className="hero-trust-divider">•</span>
              <span>UK-based support</span>
            </p>

            {/* Hero Screenshot Placeholder */}
            <div className="hero-screenshot">
              {/* TODO: Replace with real product screenshot */}
              <div className="screenshot-placeholder">
                <Play size={48} />
                <span>See Quantract in Action</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="stats-bar">
          <div className="container">
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <stat.icon size={24} className="stat-icon" />
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem/Solution */}
        <section className="problem-section">
          <div className="container">
            <div className="section-header">
              <h2>Sound Familiar?</h2>
            </div>
            <div className="problems-grid">
              <div className="problem-card">
                <div className="problem-icon problem-icon-red">
                  <X size={24} />
                </div>
                <h3>Quotes lost in emails</h3>
                <p>Spending evenings writing quotes that disappear into spam folders</p>
              </div>
              <div className="problem-card">
                <div className="problem-icon problem-icon-red">
                  <X size={24} />
                </div>
                <h3>Chasing payments</h3>
                <p>Waiting 60+ days for invoices while materials need paying upfront</p>
              </div>
              <div className="problem-card">
                <div className="problem-icon problem-icon-red">
                  <X size={24} />
                </div>
                <h3>Paper certificates</h3>
                <p>Printing, signing, scanning, posting - then chasing for signatures</p>
              </div>
            </div>
            <div className="solution-arrow">
              <ArrowRight size={32} />
            </div>
            <div className="solution-card">
              <div className="solution-icon">
                <CheckCircle size={32} />
              </div>
              <h3>One System. Everything Sorted.</h3>
              <p>Quote to cash in one place. Digital signatures. Instant certificates. Get paid faster.</p>
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">
                Try It Free <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features">
          <div className="container">
            <div className="section-header">
              <h2>Everything You Need to Run Your Business</h2>
              <p>From first quote to final payment - Quantract handles your entire workflow.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <FileText size={24} />
                </div>
                <h3>Professional Quotes</h3>
                <p>Create branded quotes in 2 minutes. Send for e-signature. Convert to jobs with one click.</p>
                <div className="feature-benefit">
                  <TrendingUp size={14} />
                  <span>Convert 40% more quotes</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Briefcase size={24} />
                </div>
                <h3>Job Tracking</h3>
                <p>See every job at a glance. Assign engineers. Track progress. Never miss a deadline.</p>
                <div className="feature-benefit">
                  <Clock size={14} />
                  <span>Save 5+ hours weekly</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Receipt size={24} />
                </div>
                <h3>Invoicing &amp; Payments</h3>
                <p>One-click invoicing. Automatic reminders. Online card payments. Xero sync included.</p>
                <div className="feature-benefit">
                  <PoundSterling size={14} />
                  <span>Get paid 40% faster</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <ScrollText size={24} />
                </div>
                <h3>Digital Certificates</h3>
                <p>EICR, EIC, Minor Works - all BS 7671 compliant. Digital signatures. PDF in seconds.</p>
                <div className="feature-benefit">
                  <Calendar size={14} />
                  <span>Same-day delivery</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Users size={24} />
                </div>
                <h3>Customer Portal</h3>
                <p>Clients view quotes, pay invoices, and download certificates - without calling you.</p>
                <div className="feature-benefit">
                  <Phone size={14} />
                  <span>Fewer phone calls</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <Building2 size={24} />
                </div>
                <h3>Multi-Company</h3>
                <p>Run multiple LTDs from one account. Separate invoicing, certs, and branding per entity.</p>
                <div className="feature-benefit">
                  <Zap size={14} />
                  <span>Perfect for groups</span>
                </div>
              </div>
            </div>
            <div className="features-cta">
              <Link href="/features" className="btn btn-secondary btn-lg">
                See All Features <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="testimonials">
          <div className="container">
            <div className="section-header">
              <h2>Trusted by Contractors Like You</h2>
              <p>Real feedback from electricians using Quantract every day.</p>
            </div>
            <div className="testimonials-grid">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="testimonial-card">
                  <Quote size={24} className="testimonial-quote-icon" />
                  <p className="testimonial-text">{testimonial.quote}</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">
                      {getInitials(testimonial.name)}
                    </div>
                    <div>
                      <div className="testimonial-name">{testimonial.name}</div>
                      <div className="testimonial-role">{testimonial.role}, {testimonial.company}</div>
                      <div className="testimonial-location">{testimonial.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Trust Badges */}
        <section className="social-proof">
          <div className="container">
            <div className="trust-badges">
              <div className="trust-badge">
                <Shield size={20} />
                <span>GDPR Compliant</span>
              </div>
              <div className="trust-badge">
                <Star size={20} />
                <span>BS 7671 Certificates</span>
              </div>
              <div className="trust-badge">
                <Clock size={20} />
                <span>UK-Based Support</span>
              </div>
              <div className="trust-badge">
                <CheckCircle size={20} />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section id="pricing" className="pricing">
          <div className="container">
            <div className="section-header">
              <h2>Simple, Honest Pricing</h2>
              <p>
                No hidden fees. No long contracts. Just fair prices that make sense.
                <br />All prices exclude VAT.
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
                <p className="price-note">+ VAT</p>
                <p className="description">
                  The foundation. Add modules as you grow.
                </p>
                <ul className="features-list">
                  <li>Quote management</li>
                  <li>Client database</li>
                  <li>Custom subdomain</li>
                  <li>3 users included</li>
                  <li>Basic reports</li>
                  <li>Email support</li>
                </ul>
                <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-secondary">
                  Start Free Trial
                </a>
              </div>

              {/* Pro Bundle */}
              <div className="pricing-card featured">
                <div className="recommended-badge">Recommended</div>
                <h3>Quantract Pro</h3>
                <div className="price">
                  <span className="currency">£</span>
                  <span className="amount">79</span>
                  <span className="period">/month</span>
                </div>
                <p className="price-note">+ VAT · Save £9/month vs modules</p>
                <p className="description">
                  Everything included. Best for growing teams.
                </p>
                <ul className="features-list">
                  <li><strong>All Core features</strong></li>
                  <li><strong>Jobs &amp; Invoicing</strong> (500/month)</li>
                  <li><strong>Digital Certificates</strong> (300/month)</li>
                  <li><strong>Customer Portal</strong></li>
                  <li><strong>Tools Pack</strong></li>
                  <li>10 users included</li>
                  <li>100GB storage</li>
                  <li>Priority support</li>
                </ul>
                <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">
                  Start Free Trial
                </a>
              </div>
            </div>

            <div className="pricing-footer">
              <p>Need more? <Link href="/pricing">See full pricing</Link> including modules and Enterprise options.</p>
              <p className="pricing-guarantee">
                <Shield size={16} />
                <strong>14-day free trial</strong> · No credit card required · Cancel anytime
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="faq">
          <div className="container">
            <div className="section-header">
              <h2>Questions? We&apos;ve Got Answers</h2>
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
            <div className="faq-footer">
              <p>Still have questions? <Link href="/contact">Get in touch</Link> - we reply within 24 hours.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="final-cta">
          <div className="container">
            <h2>Ready to Get Your Evenings Back?</h2>
            <p>Join hundreds of UK electrical contractors who&apos;ve ditched the paperwork.</p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Your Free Trial
                <ArrowRight size={18} />
              </a>
              <Link href="/contact" className="btn btn-secondary btn-lg">
                <Phone size={18} />
                Book a Demo
              </Link>
            </div>
            <p className="final-cta-note">No credit card required · Set up in 5 minutes · Cancel anytime</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="footer-logo">Quantract</span>
              <p className="footer-tagline">Job management software built for UK electrical contractors.</p>
              <div className="footer-contact">
                <a href="mailto:hello@quantract.co.uk">
                  <Mail size={16} /> hello@quantract.co.uk
                </a>
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
