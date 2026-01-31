import { redirect } from "next/navigation";

export default function MaintenanceRulesRedirect() {
  redirect("/admin/settings/maintenance");
}
