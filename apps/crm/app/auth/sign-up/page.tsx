"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

// Password strength requirements
const passwordRequirements = [
  { id: "length", label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { id: "uppercase", label: "At least one uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { id: "lowercase", label: "At least one lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { id: "number", label: "At least one number", test: (pw: string) => /[0-9]/.test(pw) },
];

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Mark field as touched on blur
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Password strength validation
  const passwordChecks = useMemo(() => {
    return passwordRequirements.map((req) => ({
      ...req,
      passed: req.test(formData.password),
    }));
  }, [formData.password]);

  const isPasswordStrong = passwordChecks.every((check) => check.passed);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  // Field validation
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (touched.name && !formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (touched.companyName && !formData.companyName.trim()) {
      errors.companyName = "Company name is required";
    }

    if (touched.email) {
      if (!formData.email.trim()) {
        errors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (touched.password && !isPasswordStrong) {
      errors.password = "Password does not meet all requirements";
    }

    if (touched.confirmPassword && formData.confirmPassword && !passwordsMatch) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (touched.terms && !termsAccepted) {
      errors.terms = "You must accept the Terms of Service and Privacy Policy";
    }

    return errors;
  }, [touched, formData, isPasswordStrong, passwordsMatch, termsAccepted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields as touched for validation
    setTouched({
      name: true,
      companyName: true,
      email: true,
      password: true,
      confirmPassword: true,
      terms: true,
    });

    // Validate all fields before submission
    if (!formData.name.trim() || !formData.companyName.trim() || !formData.email.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    if (!isPasswordStrong) {
      setError("Password does not meet all requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create account with Neon Auth
      const { error: signUpError } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (signUpError) {
        setError(signUpError.message || "Sign up failed");
        setLoading(false);
        return;
      }

      // Step 2: Call our setup endpoint to create company
      const setupRes = await fetch("/api/auth/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName: formData.companyName,
        }),
      });

      const setupData = await setupRes.json();

      if (!setupRes.ok || !setupData.ok) {
        setError(setupData.error || "Failed to setup account");
        setLoading(false);
        return;
      }

      // Step 3: Redirect to dashboard
      router.replace(setupData.redirectTo || "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="bg-[var(--card)] rounded-2xl shadow-xl p-8 border border-[var(--border)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl mb-4">
              <span className="text-white font-bold text-2xl">Q</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-[var(--muted-foreground)] mt-1">Get started with Quantract</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Your Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => handleBlur("name")}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--muted)] border text-white placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.name ? "border-red-500" : "border-[var(--border)]"
                }`}
                placeholder="John Smith"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Company Name Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Company / Trading Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                onBlur={() => handleBlur("companyName")}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--muted)] border text-white placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.companyName ? "border-red-500" : "border-[var(--border)]"
                }`}
                placeholder="Smith Electrical Ltd"
              />
              {fieldErrors.companyName && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.companyName}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => handleBlur("email")}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--muted)] border text-white placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.email ? "border-red-500" : "border-[var(--border)]"
                }`}
                placeholder="john@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onBlur={() => handleBlur("password")}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--muted)] border text-white placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.password ? "border-red-500" : "border-[var(--border)]"
                }`}
                placeholder="Create a strong password"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.password}</p>
              )}

              {/* Password Strength Indicator */}
              {formData.password.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
                    Password requirements:
                  </p>
                  <ul className="space-y-1">
                    {passwordChecks.map((check) => (
                      <li
                        key={check.id}
                        className={`flex items-center gap-2 text-xs ${
                          check.passed ? "text-green-400" : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        {check.passed ? (
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          </svg>
                        )}
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                onBlur={() => handleBlur("confirmPassword")}
                className={`w-full px-4 py-3 rounded-xl bg-[var(--muted)] border text-white placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.confirmPassword ? "border-red-500" : "border-[var(--border)]"
                }`}
                placeholder="Re-enter your password"
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.confirmPassword}</p>
              )}
              {formData.confirmPassword && !fieldErrors.confirmPassword && passwordsMatch && (
                <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Passwords match
                </p>
              )}
            </div>

            {/* Terms & Conditions Checkbox */}
            <div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  onBlur={() => handleBlur("terms")}
                  className={`mt-1 w-4 h-4 rounded cursor-pointer transition-all border-2 bg-[var(--background)] checked:bg-blue-600 checked:border-blue-600 hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    fieldErrors.terms ? "border-red-500" : "border-[var(--border)]"
                  }`}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-[var(--muted-foreground)] cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                    Privacy Policy
                  </Link>{" "}
                  <span className="text-red-400">*</span>
                </label>
              </div>
              {fieldErrors.terms && (
                <p className="mt-1 ml-7 text-sm text-red-400">{fieldErrors.terms}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
