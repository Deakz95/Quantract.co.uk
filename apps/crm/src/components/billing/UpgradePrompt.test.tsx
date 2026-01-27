/**
 * Tests for UpgradePrompt component and related billing prompts.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  Button: ({ children, onClick, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="alert-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

import {
  UpgradePrompt,
  TrialExpiredPrompt,
  TrialWarningBanner,
  UsageWarningBanner,
} from "./UpgradePrompt";

describe("UpgradePrompt Component", () => {
  const defaultProps = {
    reason: "You need more features",
    currentPlan: "solo",
    suggestedPlan: "team",
    benefit: "Unlock team collaboration",
  };

  describe("Plan Prices", () => {
    const PLAN_PRICES: Record<string, number> = {
      solo: 19,
      team: 49,
      pro: 99,
    };

    it("should have correct pricing", () => {
      expect(PLAN_PRICES.solo).toBe(19);
      expect(PLAN_PRICES.team).toBe(49);
      expect(PLAN_PRICES.pro).toBe(99);
    });
  });

  describe("Plan Features", () => {
    const PLAN_FEATURES: Record<string, string[]> = {
      solo: [
        "20 quotes per month",
        "15 invoices per month",
        "10 clients",
        "Custom subdomain",
      ],
      team: [
        "100 quotes per month",
        "75 invoices per month",
        "5 engineers",
        "50 clients",
        "Schedule & timesheets",
        "20% off Certs app",
      ],
      pro: [
        "Unlimited quotes",
        "Unlimited invoices",
        "Unlimited engineers",
        "Unlimited clients",
        "Certs app included",
        "Priority support",
      ],
    };

    it("should have increasing features per tier", () => {
      expect(PLAN_FEATURES.solo.length).toBeLessThan(
        PLAN_FEATURES.team.length
      );
      expect(PLAN_FEATURES.team.length).toBe(PLAN_FEATURES.pro.length);
    });

    it("should include unlimited options in pro tier", () => {
      const hasUnlimited = PLAN_FEATURES.pro.some((f) =>
        f.includes("Unlimited")
      );
      expect(hasUnlimited).toBe(true);
    });
  });

  describe("Modal Variant (default)", () => {
    it("should render in modal format by default", () => {
      render(<UpgradePrompt {...defaultProps} />);

      // Modal has fixed positioning
      const modal = document.querySelector(".fixed.inset-0");
      expect(modal).toBeInTheDocument();
    });

    it("should display the reason", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("You need more features")).toBeInTheDocument();
    });

    it("should display the benefit", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("Unlock team collaboration")).toBeInTheDocument();
    });

    it("should show suggested plan name", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("Team Plan")).toBeInTheDocument();
    });

    it("should show plan price", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("£49")).toBeInTheDocument();
    });

    it("should show Recommended badge", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });

    it("should show Maybe Later button", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("Maybe Later")).toBeInTheDocument();
    });

    it("should show Upgrade Now button", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(screen.getByText("Upgrade Now")).toBeInTheDocument();
    });

    it("should link to billing page", () => {
      render(<UpgradePrompt {...defaultProps} />);
      const links = screen.getAllByTestId("next-link");
      const billingLink = links.find(
        (link) => link.getAttribute("href") === "/admin/billing"
      );
      expect(billingLink).toBeInTheDocument();
    });

    it("should dismiss when Maybe Later is clicked", () => {
      const onDismiss = vi.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText("Maybe Later"));

      expect(onDismiss).toHaveBeenCalled();
    });

    it("should show cancellation policy", () => {
      render(<UpgradePrompt {...defaultProps} />);
      expect(
        screen.getByText("Cancel anytime. No long-term contracts.")
      ).toBeInTheDocument();
    });
  });

  describe("Banner Variant", () => {
    it("should render in banner format", () => {
      render(<UpgradePrompt {...defaultProps} variant="banner" />);

      // Banner should not have fixed positioning
      const modal = document.querySelector(".fixed.inset-0");
      expect(modal).not.toBeInTheDocument();
    });

    it("should show dismiss button when onDismiss provided", () => {
      render(
        <UpgradePrompt {...defaultProps} variant="banner" onDismiss={() => {}} />
      );
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });

    it("should not show dismiss button when onDismiss not provided", () => {
      render(<UpgradePrompt {...defaultProps} variant="banner" />);
      expect(screen.queryByTestId("x-icon")).not.toBeInTheDocument();
    });
  });

  describe("Inline Variant", () => {
    it("should render in inline format", () => {
      render(<UpgradePrompt {...defaultProps} variant="inline" />);

      expect(screen.getByText("Upgrade")).toBeInTheDocument();
    });

    it("should show alert icon", () => {
      render(<UpgradePrompt {...defaultProps} variant="inline" />);
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });
  });

  describe("Dismissal Behavior", () => {
    it("should hide component after dismissal", () => {
      const { container } = render(
        <UpgradePrompt {...defaultProps} onDismiss={() => {}} />
      );

      fireEvent.click(screen.getByText("Maybe Later"));

      // Component should return null after dismissal
      expect(container.firstChild).toBeNull();
    });
  });
});

describe("TrialExpiredPrompt Component", () => {
  it("should render with trial expired message", () => {
    render(<TrialExpiredPrompt />);
    expect(
      screen.getByText("Your 14-day trial has ended")
    ).toBeInTheDocument();
  });

  it("should suggest solo plan", () => {
    render(<TrialExpiredPrompt />);
    expect(screen.getByText("Solo Plan")).toBeInTheDocument();
  });

  it("should show upgrade benefit", () => {
    render(<TrialExpiredPrompt />);
    expect(
      screen.getByText(
        "Upgrade now to continue managing your quotes and invoices"
      )
    ).toBeInTheDocument();
  });
});

describe("TrialWarningBanner Component", () => {
  it("should not render when more than 7 days remaining", () => {
    const { container } = render(<TrialWarningBanner daysRemaining={8} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when 7 or fewer days remaining", () => {
    render(<TrialWarningBanner daysRemaining={7} />);
    expect(screen.getByText(/days left in your trial/)).toBeInTheDocument();
  });

  it("should show correct message for last day", () => {
    render(<TrialWarningBanner daysRemaining={0} />);
    expect(screen.getByText("Your trial ends today!")).toBeInTheDocument();
  });

  it("should show correct message for tomorrow", () => {
    render(<TrialWarningBanner daysRemaining={1} />);
    expect(screen.getByText("Your trial ends tomorrow!")).toBeInTheDocument();
  });

  it("should show days count for other values", () => {
    render(<TrialWarningBanner daysRemaining={5} />);
    expect(
      screen.getByText("5 days left in your trial")
    ).toBeInTheDocument();
  });

  it("should link to billing page", () => {
    render(<TrialWarningBanner daysRemaining={3} />);
    const link = screen.getByTestId("next-link");
    expect(link).toHaveAttribute("href", "/admin/billing");
  });
});

describe("UsageWarningBanner Component", () => {
  it("should not render when usage below 80%", () => {
    const { container } = render(
      <UsageWarningBanner type="quotes" used={15} limit={20} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when usage at 80%", () => {
    render(<UsageWarningBanner type="quotes" used={16} limit={20} />);
    expect(screen.getByText(/quotes remaining/)).toBeInTheDocument();
  });

  it("should show all used message when at limit", () => {
    render(<UsageWarningBanner type="quotes" used={20} limit={20} />);
    expect(
      screen.getByText("You've used all your quotes this month")
    ).toBeInTheDocument();
  });

  it("should show remaining count when not at limit", () => {
    render(<UsageWarningBanner type="invoices" used={12} limit={15} />);
    expect(
      screen.getByText("Only 3 invoices remaining this month")
    ).toBeInTheDocument();
  });

  it("should show usage stats", () => {
    render(<UsageWarningBanner type="quotes" used={18} limit={20} />);
    expect(screen.getByText("18 of 20 quotes used")).toBeInTheDocument();
  });

  it("should render progress bar", () => {
    const { container } = render(
      <UsageWarningBanner type="quotes" used={18} limit={20} />
    );
    const progressBar = container.querySelector(".h-2.bg-\\[var\\(--muted\\)\\]");
    expect(progressBar).toBeInTheDocument();
  });

  it("should use rose color when at 100%", () => {
    const { container } = render(
      <UsageWarningBanner type="quotes" used={20} limit={20} />
    );
    const progressFill = container.querySelector(".bg-rose-500");
    expect(progressFill).toBeInTheDocument();
  });

  it("should use amber color when between 90-100%", () => {
    const { container } = render(
      <UsageWarningBanner type="quotes" used={19} limit={20} />
    );
    const progressFill = container.querySelector(".bg-amber-500");
    expect(progressFill).toBeInTheDocument();
  });
});
