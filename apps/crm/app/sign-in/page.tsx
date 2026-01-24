import { redirect } from "next/navigation";

export default function SignInAliasPage() {
  // Legacy/old route used by previous auth experiments (e.g. Clerk).
  // Redirect to the current auth hub.
  redirect("/auth/sign-in");
}
