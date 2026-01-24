type EnvSpec = { key: string; required?: boolean };

const REQUIRED: EnvSpec[] = [
  { key: "DATABASE_URL", required: true },
  // Auth
  { key: "AUTH_SECRET", required: false },
  // Stripe
  { key: "STRIPE_SECRET_KEY", required: false },
  // Resend
  { key: "RESEND_API_KEY", required: false },
  // OpenAI
  { key: "OPENAI_API_KEY", required: false },
  // Internal cron
  { key: "INTERNAL_CRON_SECRET", required: false },
];

export function assertEnv() {
  const missing: string[] = [];
  for (const spec of REQUIRED) {
    if (spec.required && !process.env[spec.key]) missing.push(spec.key);
  }
  if (missing.length) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`;
    // Throwing early prevents partial boot with hidden failures
    throw new Error(msg);
  }
}
