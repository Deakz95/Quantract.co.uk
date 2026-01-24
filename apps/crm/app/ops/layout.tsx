import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Quantract Ops",
  description: "Admin & Engineer Portal",
  manifest: "/manifest-ops.webmanifest",
};

export default function OpsLayout({ children }: { children: ReactNode }) {
  return children;
}
