// ============================================================================
// Security Headers Configuration
// ============================================================================

// HSTS - Enable preload only if explicitly opted in
const ENABLE_HSTS_PRELOAD = process.env.ENABLE_HSTS_PRELOAD === "1";
const hstsValue = ENABLE_HSTS_PRELOAD
  ? "max-age=31536000; includeSubDomains; preload"
  : "max-age=31536000; includeSubDomains";

/**
 * Content Security Policy for Marketing Site
 *
 * Currently in Report-Only mode to avoid breaking functionality.
 * Marketing site may have different CSP needs (analytics, forms, etc.)
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.hsforms.net https://js.hs-scripts.com https://js.hs-analytics.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://www.google-analytics.com https://*.hubspot.com https://*.hsforms.com https://*.sentry.io",
  "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.hsforms.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

// Permissions Policy - disable sensitive APIs
const permissionsPolicy = [
  "geolocation=()",
  "microphone=()",
  "camera=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
].join(", ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: hstsValue },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "quantract.co.uk" }],
        destination: "https://www.quantract.co.uk/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
