import { rateLimit as baseRateLimit } from "@/lib/rateLimit";

export function getClientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
}

export function rateLimit(opts: { key: string; limit: number; windowMs: number }) {
  return baseRateLimit(opts);
}
