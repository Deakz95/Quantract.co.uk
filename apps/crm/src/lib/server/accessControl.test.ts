import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as repo from "./repo";

let dataDir = "";
let dataPath = "";

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "qt-access-"));
  dataPath = path.join(dataDir, "db.json");
  process.env.QT_DATA_PATH = dataPath;
  delete process.env.QT_USE_PRISMA;
});

afterEach(() => {
  if (dataDir) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  delete process.env.QT_DATA_PATH;
});

describe("access controls", () => {
  it("returns only assigned jobs for engineers", async () => {
    const quote1 = await repo.createQuote({
      clientName: "Alpha",
      clientEmail: "alpha@example.com",
      items: [],
    });
    const quote2 = await repo.createQuote({
      clientName: "Beta",
      clientEmail: "beta@example.com",
      items: [],
    });

    const job1 = await repo.ensureJobForQuote(quote1.id);
    const job2 = await repo.ensureJobForQuote(quote2.id);

    expect(job1).not.toBeNull();
    expect(job2).not.toBeNull();

    await repo.updateJob(job1!.id, { engineerEmail: "engineer1@example.com" });
    await repo.updateJob(job2!.id, { engineerEmail: "engineer2@example.com" });

    const jobs = await repo.listJobsForEngineer("engineer1@example.com");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(job1!.id);
  });

  it("returns only client invoices for the authenticated email", async () => {
    const quote1 = await repo.createQuote({
      clientName: "Gamma",
      clientEmail: "gamma@example.com",
      items: [],
    });
    const quote2 = await repo.createQuote({
      clientName: "Delta",
      clientEmail: "delta@example.com",
      items: [],
    });

    const inv1 = await repo.ensureInvoiceForQuote(quote1.id);
    const inv2 = await repo.ensureInvoiceForQuote(quote2.id);

    expect(inv1).not.toBeNull();
    expect(inv2).not.toBeNull();

    const invoices = await repo.listInvoicesForClientEmail("gamma@example.com");
    expect(invoices).toHaveLength(1);
    expect(invoices[0].id).toBe(inv1!.id);
  });
});
