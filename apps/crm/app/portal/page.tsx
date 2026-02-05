import { redirect } from "next/navigation";

/**
 * Legacy /portal route — redirects to the canonical /client portal.
 * Kept as a server component redirect to avoid breaking existing bookmarks/links.
 */
export default function PortalRedirect() {
  redirect("/client");
}
