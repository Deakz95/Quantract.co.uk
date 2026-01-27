import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.quantract.co.uk"),
  title: "Quantract - Job Management Software for Electrical Contractors",
  description:
    "Cut admin time by 5 hours a week. Quotes, jobs, invoices, and digital certificates - all in one place. Built for UK electrical contractors. Start your free trial.",
  keywords: [
    "electrical contractor software",
    "job management",
    "electrical certificates",
    "EICR software",
    "EIC software",
    "minor works certificate",
    "contractor invoicing",
    "quote software",
    "UK electrician software",
    "BS 7671",
  ],
  authors: [{ name: "Quantract Ltd" }],
  creator: "Quantract Ltd",
  publisher: "Quantract Ltd",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.quantract.co.uk",
    siteName: "Quantract",
    title: "Quantract - Job Management Software for Electrical Contractors",
    description:
      "Cut admin time by 5 hours a week. Quotes, jobs, invoices, and digital certificates - all in one place. Built for UK electrical contractors.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quantract - Professional Software for Electrical Contractors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quantract - Job Management Software for Electrical Contractors",
    description:
      "Cut admin time by 5 hours a week. Quotes, jobs, invoices, and digital certificates - all in one place.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.quantract.co.uk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#16a34a",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Quantract",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "19",
    priceCurrency: "GBP",
    priceValidUntil: "2027-12-31",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "50",
  },
  description:
    "Professional job management software for UK electrical contractors. Quotes, jobs, invoices, and digital certificates.",
  provider: {
    "@type": "Organization",
    name: "Quantract Ltd",
    url: "https://www.quantract.co.uk",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
