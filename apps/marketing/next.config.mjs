/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
