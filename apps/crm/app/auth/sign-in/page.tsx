import { redirect } from "next/navigation";

export default function SignInPage() {
  // Redirect to role-based login pages
  redirect("/admin/login");
}
