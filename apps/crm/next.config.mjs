import { withSentryConfig } from "@sentry/nextjs";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,  async headers() {
    return [
      {
        source: "/manifest-client.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
      {
        source: "/manifest-ops.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

const configWithPWA = withPWA(nextConfig);

export default withSentryConfig(configWithPWA, {
  silent: true,
});
