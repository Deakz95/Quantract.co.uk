/**
 * Tests for FeatureGate component.
 * Tests conditional rendering and upgrade prompts.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock dependencies
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/lib/cn", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

import { FeatureGate } from "./FeatureGate";

describe("FeatureGate Component", () => {
  const defaultProps = {
    enabled: false,
    title: "Premium Feature",
    description: "Upgrade to access this feature",
    children: <div data-testid="gated-content">Protected Content</div>,
  };

  describe("When feature is enabled", () => {
    it("should render children directly without gate UI", () => {
      render(<FeatureGate {...defaultProps} enabled={true} />);

      expect(screen.getByTestId("gated-content")).toBeInTheDocument();
      expect(screen.queryByText("Premium Feature")).not.toBeInTheDocument();
    });

    it("should not show upgrade prompt when enabled", () => {
      render(<FeatureGate {...defaultProps} enabled={true} />);

      expect(screen.queryByText("Upgrade plan")).not.toBeInTheDocument();
    });
  });

  describe("When feature is disabled", () => {
    it("should show the upgrade prompt with title", () => {
      render(<FeatureGate {...defaultProps} />);

      expect(screen.getByText("Premium Feature")).toBeInTheDocument();
    });

    it("should show the description", () => {
      render(<FeatureGate {...defaultProps} />);

      expect(
        screen.getByText("Upgrade to access this feature")
      ).toBeInTheDocument();
    });

    it("should show default CTA label", () => {
      render(<FeatureGate {...defaultProps} />);

      expect(screen.getByText("Upgrade plan")).toBeInTheDocument();
    });

    it("should use custom CTA label when provided", () => {
      render(<FeatureGate {...defaultProps} ctaLabel="Go Pro" />);

      expect(screen.getByText("Go Pro")).toBeInTheDocument();
    });

    it("should link to default billing page", () => {
      render(<FeatureGate {...defaultProps} />);

      const link = screen.getByTestId("next-link");
      expect(link).toHaveAttribute("href", "/admin/billing");
    });

    it("should use custom href when provided", () => {
      render(<FeatureGate {...defaultProps} ctaHref="/pricing" />);

      const link = screen.getByTestId("next-link");
      expect(link).toHaveAttribute("href", "/pricing");
    });

    it("should still render children but with reduced opacity", () => {
      render(<FeatureGate {...defaultProps} />);

      expect(screen.getByTestId("gated-content")).toBeInTheDocument();
    });

    it("should apply pointer-events-none to gated content", () => {
      const { container } = render(<FeatureGate {...defaultProps} />);

      const gatedWrapper = container.querySelector(".pointer-events-none");
      expect(gatedWrapper).toBeInTheDocument();
    });
  });

  describe("UI Styling", () => {
    it("should have amber/warning styling for the gate message", () => {
      const { container } = render(<FeatureGate {...defaultProps} />);

      const gateBox = container.querySelector(".border-amber-200");
      expect(gateBox).toBeInTheDocument();
    });

    it("should apply opacity-60 to disabled content", () => {
      const { container } = render(<FeatureGate {...defaultProps} />);

      const disabledContent = container.querySelector(".opacity-60");
      expect(disabledContent).toBeInTheDocument();
    });
  });
});
