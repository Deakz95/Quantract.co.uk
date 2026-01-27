"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  ArrowRight,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle,
  Send,
} from "lucide-react";

export default function ContactPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "general",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API endpoint
    // For now, we'll show a success message and open mailto
    const mailtoLink = `mailto:hello@quantract.co.uk?subject=${encodeURIComponent(
      formState.subject === "demo" ? "Demo Request" :
      formState.subject === "sales" ? "Sales Enquiry" :
      formState.subject === "support" ? "Support Request" : "General Enquiry"
    )} from ${formState.name}&body=${encodeURIComponent(
      `Name: ${formState.name}\nEmail: ${formState.email}\nCompany: ${formState.company}\nPhone: ${formState.phone}\n\nMessage:\n${formState.message}`
    )}`;
    window.location.href = mailtoLink;
    setSubmitted(true);
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo" aria-label="Quantract home">Quantract</Link>
          <div className="nav-links nav-links-desktop">
            <Link href="/features" className="nav-link">Features</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/contact" className="nav-link nav-link-active">Contact</Link>
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
            <h1>Get in Touch</h1>
            <p className="page-hero-subtitle">
              Questions about Quantract? Want a demo? We&apos;re here to help.
              <br />
              <strong>We reply within 24 hours</strong> (usually much faster).
            </p>
          </div>
        </section>

        {/* Contact Options */}
        <section className="contact-options">
          <div className="container">
            <div className="contact-options-grid">
              <a href="mailto:hello@quantract.co.uk" className="contact-option-card">
                <div className="contact-option-icon">
                  <Mail size={28} />
                </div>
                <h3>Email Us</h3>
                <p>hello@quantract.co.uk</p>
                <span className="contact-option-note">We reply within 24 hours</span>
              </a>

              <a href="mailto:support@quantract.co.uk" className="contact-option-card">
                <div className="contact-option-icon">
                  <MessageCircle size={28} />
                </div>
                <h3>Support</h3>
                <p>support@quantract.co.uk</p>
                <span className="contact-option-note">For existing customers</span>
              </a>

              <a href="https://wa.me/447000000000" className="contact-option-card contact-option-whatsapp" target="_blank" rel="noopener noreferrer">
                <div className="contact-option-icon">
                  <Phone size={28} />
                </div>
                <h3>Quick Chat</h3>
                <p>Message us on WhatsApp</p>
                <span className="contact-option-note">Fast responses 9am-5pm</span>
              </a>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="contact-form-section">
          <div className="container">
            <div className="contact-form-grid">
              <div className="contact-form-info">
                <h2>Book a Demo or Ask a Question</h2>
                <p>
                  Fill in the form and we&apos;ll get back to you within 24 hours.
                  If you&apos;re asking about a demo, we can usually arrange a call within a few days.
                </p>

                <div className="contact-expectations">
                  <h3>What to Expect</h3>
                  <ul>
                    <li>
                      <Clock size={18} />
                      <span><strong>Response time:</strong> Within 24 hours (usually same day)</span>
                    </li>
                    <li>
                      <CheckCircle size={18} />
                      <span><strong>Demo calls:</strong> 20-30 minutes via video call</span>
                    </li>
                    <li>
                      <CheckCircle size={18} />
                      <span><strong>No pressure:</strong> We&apos;re here to help, not hard sell</span>
                    </li>
                  </ul>
                </div>

                <div className="contact-hours">
                  <h3>Support Hours</h3>
                  <p>Monday - Friday: 9am - 5pm GMT</p>
                  <p className="text-muted">We monitor emails outside these hours for urgent issues.</p>
                </div>
              </div>

              <div className="contact-form-wrapper">
                {submitted ? (
                  <div className="contact-form-success">
                    <CheckCircle size={48} />
                    <h3>Thanks for getting in touch!</h3>
                    <p>We&apos;ll reply within 24 hours. Check your email client - we&apos;ve opened a draft message for you.</p>
                    <button onClick={() => setSubmitted(false)} className="btn btn-secondary">
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="name">Name <span className="required">*</span></label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">Email <span className="required">*</span></label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          placeholder="you@company.co.uk"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="company">Company</label>
                        <input
                          type="text"
                          id="company"
                          value={formState.company}
                          onChange={(e) => setFormState({ ...formState, company: e.target.value })}
                          placeholder="Your company name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="phone">Phone</label>
                        <input
                          type="tel"
                          id="phone"
                          value={formState.phone}
                          onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                          placeholder="07xxx xxxxxx"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="subject">What can we help with? <span className="required">*</span></label>
                      <select
                        id="subject"
                        required
                        value={formState.subject}
                        onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      >
                        <option value="general">General enquiry</option>
                        <option value="demo">Book a demo</option>
                        <option value="sales">Sales / Pricing question</option>
                        <option value="support">Technical support</option>
                        <option value="partnership">Partnership / Integration</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="message">Message <span className="required">*</span></label>
                      <textarea
                        id="message"
                        required
                        rows={5}
                        value={formState.message}
                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg">
                      <Send size={18} />
                      Send Message
                    </button>

                    <p className="form-privacy">
                      By submitting this form, you agree to our <Link href="/privacy">Privacy Policy</Link>.
                      We&apos;ll only use your information to respond to your enquiry.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="final-cta">
          <div className="container">
            <h2>Ready to Try Quantract?</h2>
            <p>Start your 14-day free trial. No credit card required.</p>
            <div className="hero-buttons">
              <a href="https://crm.quantract.co.uk/auth/sign-up" className="btn btn-primary btn-lg">
                Start Free Trial <ArrowRight size={18} />
              </a>
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
