"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  ArrowRight,
  Shield,
  Users,
  Zap,
  Heart,
  Mail,
  MapPin,
  CheckCircle,
} from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Built for Speed",
    description: "Your time is valuable. Everything in Quantract is designed to be fast - from creating quotes to generating certificates.",
  },
  {
    icon: Heart,
    title: "Made for Trades",
    description: "We don't build generic software. Every feature is designed specifically for electrical contractors and building services.",
  },
  {
    icon: Shield,
    title: "Compliance First",
    description: "BS 7671 compliant certificates, GDPR data handling, and proper audit trails. Built to keep you on the right side of regulations.",
  },
  {
    icon: Users,
    title: "Real Support",
    description: "UK-based support team who understand your industry. No offshore call centres or chatbots - real people who can actually help.",
  },
];

const timeline = [
  { year: "2024", event: "Founded with a mission to help UK electrical contractors work smarter" },
  { year: "2025", event: "Beta launch with 50 contractors across the UK" },
  { year: "2026", event: "Public launch with full certificate support and customer portal" },
];

export default function AboutPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo" aria-label="Quantract home">Quantract</Link>
          <div className="nav-links nav-links-desktop">
            <Link href="/features" className="nav-link">Features</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/about" className="nav-link nav-link-active">About</Link>
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
            <h1>Built by People Who Get It</h1>
            <p className="page-hero-subtitle">
              We&apos;ve seen how much time electrical contractors waste on admin.
              So we built software that actually helps.
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="about-story">
          <div className="container">
            <div className="about-story-grid">
              <div className="about-story-content">
                <h2>Why We Built Quantract</h2>
                <p>
                  We kept hearing the same story from electrical contractors: &quot;I spend my evenings doing paperwork instead of being with my family.&quot;
                </p>
                <p>
                  Quotes getting lost in emails. Chasing invoices for months. Printing certificates, scanning them, posting them, then chasing for signatures.
                  Hours wasted on admin that doesn&apos;t make you any money.
                </p>
                <p>
                  The existing software was either designed for massive construction firms (too complex, too expensive) or consumer apps
                  that didn&apos;t understand compliance requirements like BS 7671.
                </p>
                <p>
                  <strong>So we built Quantract.</strong> Software designed specifically for UK electrical contractors.
                  Simple enough to use on a phone between jobs. Powerful enough to run your whole business.
                </p>
              </div>
              <div className="about-story-stats">
                <div className="about-stat">
                  <div className="about-stat-value">5+</div>
                  <div className="about-stat-label">Hours saved per week</div>
                </div>
                <div className="about-stat">
                  <div className="about-stat-value">100%</div>
                  <div className="about-stat-label">UK-based support</div>
                </div>
                <div className="about-stat">
                  <div className="about-stat-value">BS 7671</div>
                  <div className="about-stat-label">Compliant certificates</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="about-values">
          <div className="container">
            <div className="section-header">
              <h2>What We Believe</h2>
            </div>
            <div className="values-grid">
              {values.map((value, index) => (
                <div key={index} className="value-card">
                  <div className="value-icon">
                    <value.icon size={28} />
                  </div>
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="about-timeline">
          <div className="container">
            <div className="section-header">
              <h2>Our Journey</h2>
            </div>
            <div className="timeline">
              {timeline.map((item, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-year">{item.year}</div>
                  <div className="timeline-event">{item.event}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="about-company">
          <div className="container">
            <div className="company-info-grid">
              <div className="company-info-card">
                <h3>Quantract Ltd</h3>
                <p>Registered in England &amp; Wales</p>
                <div className="company-detail">
                  <MapPin size={18} />
                  <span>United Kingdom</span>
                </div>
                <div className="company-detail">
                  <Mail size={18} />
                  <a href="mailto:hello@quantract.co.uk">hello@quantract.co.uk</a>
                </div>
              </div>
              <div className="company-info-card">
                <h3>Data &amp; Security</h3>
                <ul className="company-trust-list">
                  <li><CheckCircle size={16} /> GDPR Compliant</li>
                  <li><CheckCircle size={16} /> UK/EU data hosting</li>
                  <li><CheckCircle size={16} /> Bank-level encryption</li>
                  <li><CheckCircle size={16} /> Regular security audits</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="final-cta">
          <div className="container">
            <h2>Ready to Save Time on Admin?</h2>
            <p>Join hundreds of UK electrical contractors using Quantract.</p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Free Trial <ArrowRight size={18} />
              </a>
              <Link href="/contact" className="btn btn-secondary btn-lg">
                Get in Touch
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
