import { withSentryConfig } from "@sentry/nextjs";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// ============================================================================
// Security Headers Configuration
// ============================================================================

// HSTS - Enable preload only if explicitly opted in
const ENABLE_HSTS_PRELOAD = process.env.ENABLE_HSTS_PRELOAD === "1";
const hstsValue = ENABLE_HSTS_PRELOAD
  ? "max-age=31536000; includeSubDomains; preload"
  : "max-age=31536000; includeSubDomains";

/**
 * Content Security Policy
 *
 * Currently in Report-Only mode to avoid breaking functionality.
 * To enforce, change the header name from
 * "Content-Security-Policy-Report-Only" to "Content-Security-Policy"
 *
 * Notes:
 * - 'unsafe-inline' for styles is required by many UI libraries
 * - 'unsafe-eval' may be needed for some Next.js features in dev
 * - Add report-uri or report-to when you have a CSP violation collector
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.sentry.io wss:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
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

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async redirects() {
    return [
      { source: "/login", destination: "/admin/login", permanent: true },
      { source: "/register", destination: "/auth/sign-up", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
      { source: "/admin/register", destination: "/auth/sign-up", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/manifest-client.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          ...securityHeaders,
        ],
      },
      {
        source: "/manifest-ops.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          ...securityHeaders,
        ],
      },
    ];
  },
};

const configWithPWA = withPWA(nextConfig);

export default withSentryConfig(configWithPWA, {
  silent: true,
});
