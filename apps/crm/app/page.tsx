import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Zap, Clock, Users, BarChart3, Check, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";
import { AuthAwareNavButtons, AuthAwareHeroCTA } from "@/components/landing/AuthAwareNav";

const features = [
  {
    icon: FileText,
    title: "Professional Quotes",
    description: "Create beautiful, branded quotes in minutes. Send for approval with one click.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "Instant Invoicing",
    description: "Convert approved quotes to invoices automatically. Get paid faster.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Clock,
    title: "Job Scheduling",
    description: "Assign jobs to engineers, track progress, and keep clients informed.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Manage engineers, timesheets, and job costs from one dashboard.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Shield,
    title: "Electrical Certificates",
    description: "BS 7671 compliant certificates. Fill, sign, and send digitally.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: BarChart3,
    title: "Profitability Tracking",
    description: "Know your margins on every job. Make data-driven decisions.",
    color: "from-indigo-500 to-blue-500",
  },
];

const plans = [
  {
    name: "Solo",
    price: 19,
    description: "Perfect for sole traders",
    features: [
      "20 quotes per month",
      "15 invoices per month",
      "10 clients",
      "Custom branded portal",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Team",
    price: 49,
    description: "For growing businesses",
    features: [
      "100 quotes per month",
      "75 invoices per month",
      "5 engineers",
      "50 clients",
      "Schedule & timesheets",
      "20% off Certs app",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Pro",
    price: 99,
    description: "For established contractors",
    features: [
      "Unlimited quotes",
      "Unlimited invoices",
      "Unlimited engineers",
      "Unlimited clients",
      "Certs app included",
      "API access",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "Quantract has transformed how we manage our electrical business. Quotes that used to take hours now take minutes.",
    author: "James Wilson",
    role: "Director, Wilson Electrical",
  },
  {
    quote: "The job scheduling and timesheet features alone have saved us thousands. Highly recommended.",
    author: "Sarah Mitchell",
    role: "Operations Manager, Spark Solutions",
  },
  {
    quote: "Finally, software built by people who understand the electrical trade. It just works.",
    author: "Dave Thompson",
    role: "Owner, DT Electrical Services",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="font-bold text-lg text-[var(--foreground)]">Quantract</span>
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Testimonials</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <ThemeToggle className="mr-2" />
              <AuthAwareNavButtons />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[var(--primary)] rounded-full blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="gradient" className="mb-6 px-4 py-1.5">
              <span className="mr-2">⚡</span>
              Built for Electrical Contractors
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--foreground)]">
              Run Your Electrical Business
              <span className="block mt-2 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)] bg-clip-text text-transparent">
                Without the Paperwork
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Quotes, invoices, job scheduling, timesheets, and electrical certificates — 
              all in one platform. Start your 14-day free trial today.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <AuthAwareHeroCTA />
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-transparent text-[var(--primary)] border-2 border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] px-8 py-3.5 text-base w-full sm:w-auto"
              >
                View Pricing
              </Link>
            </div>

            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] to-transparent z-10 h-32 bottom-0 top-auto" />
            <div className="rounded border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
              <div className="bg-[var(--muted)] px-4 py-3 flex items-center gap-2 border-b border-[var(--border)]">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-4 text-xs text-[var(--muted-foreground)]">quantract.co.uk/admin</span>
              </div>
              <div className="p-6 bg-gradient-to-br from-[var(--card)] to-[var(--muted)] min-h-[300px] flex items-center justify-center">
                <div className="text-center text-[var(--muted-foreground)]">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="font-medium">Your Dashboard Preview</p>
                  <p className="text-sm mt-1">Sign up to see the full experience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-[var(--muted)]/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              Everything You Need to Grow
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
              From first quote to final invoice, Quantract handles it all.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} variant="interactive" className="group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-[var(--primary)] shadow-xl scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="gradient">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-black text-[var(--foreground)]">£{plan.price}</span>
                    <span className="text-[var(--muted-foreground)]">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-[var(--foreground)]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/sign-up"
                    className={cn(
                      "block w-full text-center rounded-xl font-semibold transition-all duration-200 px-5 py-2.5 text-sm",
                      plan.popular
                        ? "bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-lg hover:shadow-xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top"
                        : "bg-transparent text-[var(--primary)] border-2 border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
                    )}
                  >
                    {plan.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center mt-8 text-sm text-[var(--muted-foreground)]">
            Need more? <a href="mailto:hello@quantract.co.uk" className="text-[var(--primary)] hover:underline">Contact us</a> for Enterprise pricing.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 sm:py-32 bg-[var(--muted)]/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              Trusted by Electricians Nationwide
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="bg-[var(--card)]">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-500">★</span>
                    ))}
                  </div>
                  <p className="text-[var(--foreground)] mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{testimonial.author[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{testimonial.author}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Card variant="gradient" className="p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)] rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                Ready to Transform Your Business?
              </h2>
              <p className="mt-4 text-[var(--muted-foreground)] max-w-lg mx-auto">
                Join hundreds of electrical contractors who&apos;ve ditched the paperwork 
                and grown their business with Quantract.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-lg hover:shadow-xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top px-8 py-3.5 text-base"
                >
                  Start Your Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                14 days free • No credit card required
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <span className="font-bold text-lg text-[var(--foreground)]">Quantract</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Professional business management for electrical contractors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><a href="#features" className="hover:text-[var(--foreground)]">Features</a></li>
                <li><a href="#pricing" className="hover:text-[var(--foreground)]">Pricing</a></li>
                <li><Link href="/admin/login" className="hover:text-[var(--foreground)]">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><Link href="/about" className="hover:text-[var(--foreground)]">About</Link></li>
                <li><a href="mailto:hello@quantract.co.uk" className="hover:text-[var(--foreground)]">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-[var(--foreground)]">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              © {new Date().getFullYear()} Quantract. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
