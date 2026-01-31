import type { ReactNode } from "react";

export const metadata = {
  title: "Tools | Quantract",
  description: "Electrical contractor tools and calculators",
};

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
