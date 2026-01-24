import { redirect } from "next/navigation";

export default function SignInRedirectAliasPage() {
  // Some clients may try to hit /sign-in-redirect?url=...
  // We send them to the auth hub (it can read query params if needed).
  redirect("/auth/sign-in");
}
