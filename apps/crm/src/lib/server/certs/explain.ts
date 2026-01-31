/**
 * Template-based outcome explanation generator.
 * Deterministic, testable, no AI.
 */

import type { CertificateOutcome, ObservationInput } from "./rules";

/**
 * Generate a human-readable explanation of the certificate outcome.
 * Suitable for inclusion in PDFs and UI display.
 */
export function explainOutcome(
  outcome: CertificateOutcome,
  observations?: ObservationInput[],
): string {
  const lines: string[] = [];

  switch (outcome.outcome) {
    case "satisfactory": {
      lines.push("This installation is assessed as SATISFACTORY.");
      const c3Count = observations?.filter((o) => o.code === "C3" && !o.resolvedAt).length ?? 0;
      if (c3Count > 0) {
        lines.push(
          `${c3Count} improvement recommendation${c3Count > 1 ? "s" : ""} (C3) ${c3Count > 1 ? "have" : "has"} been noted. These are advisory and do not indicate danger.`,
        );
      } else {
        lines.push("No defects or recommendations identified.");
      }
      break;
    }

    case "unsatisfactory": {
      lines.push("This installation is assessed as UNSATISFACTORY.");
      if (observations) {
        const c1 = observations.filter((o) => o.code === "C1" && !o.resolvedAt);
        const c2 = observations.filter((o) => o.code === "C2" && !o.resolvedAt);

        if (c1.length > 0) {
          lines.push(
            `${c1.length} x C1 (Danger present) — immediate remedial action required before the installation can be used safely.`,
          );
          for (const obs of c1.slice(0, 3)) {
            lines.push(`  • ${obs.location ? obs.location + ": " : ""}${obs.description}`);
          }
          if (c1.length > 3) lines.push(`  … and ${c1.length - 3} more.`);
        }

        if (c2.length > 0) {
          lines.push(
            `${c2.length} x C2 (Potentially dangerous) — urgent remedial action required.`,
          );
          for (const obs of c2.slice(0, 3)) {
            lines.push(`  • ${obs.location ? obs.location + ": " : ""}${obs.description}`);
          }
          if (c2.length > 3) lines.push(`  … and ${c2.length - 3} more.`);
        }
      }

      // Include test-based failures from outcome details
      const testFailures = outcome.details.filter((d) => !d.passed && d.rule.startsWith("test."));
      if (testFailures.length > 0) {
        lines.push("Test result failures:");
        for (const f of testFailures.slice(0, 5)) {
          lines.push(`  • ${f.message}`);
        }
      }

      const checklistFailures = outcome.details.filter((d) => !d.passed && d.rule.startsWith("checklist."));
      if (checklistFailures.length > 0) {
        for (const f of checklistFailures) {
          lines.push(`  • ${f.message}`);
        }
      }
      break;
    }

    case "further_investigation": {
      lines.push("FURTHER INVESTIGATION is required.");
      const fi = observations?.filter((o) => o.code === "FI" && !o.resolvedAt) ?? [];
      if (fi.length > 0) {
        lines.push(
          `${fi.length} item${fi.length > 1 ? "s" : ""} require${fi.length === 1 ? "s" : ""} further investigation to determine the nature and extent of any defect:`,
        );
        for (const obs of fi.slice(0, 5)) {
          lines.push(`  • ${obs.location ? obs.location + ": " : ""}${obs.description}`);
        }
      }
      break;
    }
  }

  return lines.join("\n");
}

/**
 * Generate a summary table of observation counts by code.
 */
export function observationSummary(
  observations: ObservationInput[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const obs of observations) {
    if (!obs.resolvedAt) {
      counts[obs.code] = (counts[obs.code] || 0) + 1;
    }
  }
  return counts;
}
