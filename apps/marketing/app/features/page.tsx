"use client";

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
  ArrowRight,
  Clock,
  PoundSterling,
  Shield,
  Zap,
  Calculator,
  BarChart3,
  Bell,
  Cloud,
  Lock,
  Smartphone,
  Mail,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    id: "quotes",
    icon: FileText,
    title: "Professional Quotes",
    headline: "Win More Work with Professional Quotes",
    description: "Create branded, itemised quotes in minutes. Send for e-signature. Convert accepted quotes to jobs with one click.",
    benefits: [
      { text: "Create quotes in under 2 minutes", icon: Clock },
      { text: "Digital signatures - no printing or scanning", icon: CheckCircle },
      { text: "Automatic follow-up reminders", icon: Bell },
      { text: "Convert to jobs with one click", icon: Zap },
    ],
    stat: { value: "40%", label: "higher conversion rate" },
  },
  {
    id: "jobs",
    icon: Briefcase,
    title: "Job Management",
    headline: "Track Every Job from Start to Finish",
    description: "See all your jobs at a glance. Assign engineers, manage stages, track time, and never miss a deadline again.",
    benefits: [
      { text: "Visual job board - see status instantly", icon: BarChart3 },
      { text: "Assign engineers and track workload", icon: Users },
      { text: "Add notes, photos, and documents", icon: Cloud },
      { text: "Deadline reminders and notifications", icon: Bell },
    ],
    stat: { value: "5+", label: "hours saved per week" },
  },
  {
    id: "invoicing",
    icon: Receipt,
    title: "Invoicing & Payments",
    headline: "Get Paid Faster with Online Invoicing",
    description: "Generate invoices from jobs. Send automatic payment reminders. Accept card payments online. Sync to Xero.",
    benefits: [
      { text: "One-click invoice generation", icon: Zap },
      { text: "Automatic payment reminders", icon: Bell },
      { text: "Accept cards via Stripe", icon: PoundSterling },
      { text: "Xero integration included", icon: CheckCircle },
    ],
    stat: { value: "40%", label: "faster payment times" },
  },
  {
    id: "certificates",
    icon: ScrollText,
    title: "Digital Certificates",
    headline: "Issue Compliant Certificates in Seconds",
    description: "Create EICR, EIC, Minor Works, and Fire Alarm certificates. All fully BS 7671 compliant with digital signatures.",
    benefits: [
      { text: "All major certificate types included", icon: CheckCircle },
      { text: "BS 7671 compliant forms", icon: Shield },
      { text: "Digital signatures built-in", icon: Lock },
      { text: "Instant PDF generation", icon: Zap },
    ],
    stat: { value: "Same-day", label: "certificate delivery" },
  },
  {
    id: "portal",
    icon: Users,
    title: "Customer Portal",
    headline: "Let Clients Self-Serve 24/7",
    description: "Clients can view quotes, sign agreements, pay invoices, and download certificates - without calling you.",
    benefits: [
      { text: "Branded portal with your logo", icon: Building2 },
      { text: "Clients sign quotes digitally", icon: FileText },
      { text: "Online invoice payments", icon: PoundSterling },
      { text: "Certificate access anytime", icon: Clock },
    ],
    stat: { value: "50%", label: "fewer phone calls" },
  },
  {
    id: "tools",
    icon: Calculator,
    title: "Tools Pack",
    headline: "Professional Tools at Your Fingertips",
    description: "Cable calculator, point counter, and other essential tools for electrical contractors. All in one place.",
    benefits: [
      { text: "Cable sizing calculator", icon: Calculator },
      { text: "Point counter for quotes", icon: BarChart3 },
      { text: "Works on mobile", icon: Smartphone },
      { text: "Saves calculation history", icon: Cloud },
    ],
    stat: { value: "15+", label: "professional tools" },
  },
];

const additionalFeatures = [
  { icon: Building2, title: "Multi-Entity", description: "Run multiple LTDs from one account with separate invoicing and branding" },
  { icon: Cloud, title: "Cloud Storage", description: "Store documents, photos, and certificates securely in the cloud" },
  { icon: BarChart3, title: "Reports", description: "Track revenue, jobs completed, and business performance" },
  { icon: Smartphone, title: "Mobile Ready", description: "Works on any device - phone, tablet, or desktop" },
  { icon: Lock, title: "Secure", description: "Bank-level encryption and GDPR compliant data handling" },
  { icon: Bell, title: "Notifications", description: "Email and SMS alerts for quotes, payments, and deadlines" },
];

export default function FeaturesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo" aria-label="Quantract home">
            Quantract
          </Link>
          <div className="nav-links nav-links-desktop">
            <Link href="/features" className="nav-link nav-link-active">Features</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/contact" className="nav-link">Contact</Link>
            <a href="https://crm.quantract.co.uk/admin/login" className="nav-link">Sign In</a>
            <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary">
              Try Free for 14 Days
            </a>
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
        <div
          id="mobile-menu"
          className={`mobile-menu ${mobileMenuOpen ? "mobile-menu-open" : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <Link href="/features" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link href="/pricing" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link href="/about" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link href="/contact" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          <a href="https://crm.quantract.co.uk/admin/login" className="mobile-menu-link">Sign In</a>
          <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary mobile-menu-cta">
            Try Free for 14 Days
          </a>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="page-hero">
          <div className="container">
            <h1>Everything You Need to Run Your Electrical Business</h1>
            <p className="page-hero-subtitle">
              From quoting to getting paid, Quantract handles your entire workflow.
              Built specifically for UK electrical contractors.
            </p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Free Trial <ArrowRight size={18} />
              </a>
              <Link href="/pricing" className="btn btn-secondary btn-lg">
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        {features.map((feature, index) => (
          <section
            key={feature.id}
            id={feature.id}
            className={`feature-section ${index % 2 === 1 ? "feature-section-alt" : ""}`}
          >
            <div className="container">
              <div className="feature-section-grid">
                <div className="feature-section-content">
                  <div className="feature-section-icon">
                    <feature.icon size={32} />
                  </div>
                  <h2>{feature.headline}</h2>
                  <p className="feature-section-desc">{feature.description}</p>
                  <ul className="feature-benefits-list">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i}>
                        <benefit.icon size={18} className="benefit-icon" />
                        <span>{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="feature-stat">
                    <span className="feature-stat-value">{feature.stat.value}</span>
                    <span className="feature-stat-label">{feature.stat.label}</span>
                  </div>
                </div>
                <div className="feature-section-visual">
                  {/* TODO: Replace with real screenshots */}
                  <div className="feature-screenshot-placeholder">
                    <feature.icon size={64} />
                    <span>{feature.title}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Additional Features Grid */}
        <section className="additional-features">
          <div className="container">
            <div className="section-header">
              <h2>Plus Everything Else You Need</h2>
              <p>All the tools to run a modern electrical business.</p>
            </div>
            <div className="additional-features-grid">
              {additionalFeatures.map((feature, index) => (
                <div key={index} className="additional-feature-card">
                  <feature.icon size={24} className="additional-feature-icon" />
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="final-cta">
          <div className="container">
            <h2>Ready to Streamline Your Business?</h2>
            <p>Start your 14-day free trial today. No credit card required.</p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Free Trial <ArrowRight size={18} />
              </a>
              <Link href="/contact" className="btn btn-secondary btn-lg">
                Book a Demo
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
