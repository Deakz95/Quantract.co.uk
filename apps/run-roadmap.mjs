import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const RUN_MD = path.resolve(ROOT, "run.md");
const ROADMAP = path.resolve(ROOT, "roadmap.txt");
const REVIEW = path.resolve(ROOT, "apps/handoff/review.md");
const APPROVAL = path.resolve(ROOT, "apps/handoff/approval.md");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readFileSafe(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function writeRunMd(stage, mode, status) {
  fs.writeFileSync(
    RUN_MD,
    `Mode: ${mode}\nCurrent-Stage: ${stage}\nStage-Status: ${status}\n`,
    "utf8"
  );
}

function parseApproval(md) {
  // very simple parse: look for "status:" and "scope:" inside approval block
  const status = (md.match(/status:\s*(\w+)/i) || [])[1] || "";
  const scope = (md.match(/scope:\s*([^\n]+)/i) || [])[1] || "";
  return { status: status.toUpperCase(), scope: scope.trim() };
}

async function waitForApproval(stage, desiredStatuses = ["APPROVE"]) {
  while (true) {
    const a = readFileSafe(APPROVAL);
    const { status, scope } = parseApproval(a);
    if (scope.includes(stage) && desiredStatuses.includes(status)) return { status, raw: a };
    if (scope.includes(stage) && (status === "REVISE" || status === "BLOCK")) {
      return { status, raw: a };
    }
    await sleep(2000);
  }
}

async function waitForReviewChange(lastHash = "") {
  while (true) {
    const r = readFileSafe(REVIEW);
    const hash = String(r.length) + ":" + r.slice(0, 50) + ":" + r.slice(-50);
    if (r && hash !== lastHash) return { r, hash };
    await sleep(2000);
  }
}

function runReviewer() {
  execSync("node tools/reviewer.mjs", { stdio: "inherit" });
}

async function runStage(stage) {
  console.log(`\n=== Stage ${stage} (PLAN) ===`);
  writeRunMd(stage, "PLAN", "PENDING");

  // Wait for Claude to write plan (review.md changes), then run reviewer
  let { hash: planHash } = await waitForReviewChange("");
  runReviewer();
  const planApproval = await waitForApproval(stage);

  if (planApproval.status !== "APPROVE") {
    console.log(`Stage ${stage} plan not approved: ${planApproval.status}`);
    console.log(planApproval.raw);
    process.exit(1);
  }

  console.log(`\n=== Stage ${stage} (EXECUTE) ===`);
  writeRunMd(stage, "EXECUTE", "RUNNING");

  // Wait for Claude to write completion report, then run reviewer again
  let { hash: completionHash } = await waitForReviewChange(planHash);
  runReviewer();
  const execApproval = await waitForApproval(stage);

  if (execApproval.status !== "APPROVE") {
    console.log(`Stage ${stage} execution not approved: ${execApproval.status}`);
    console.log(execApproval.raw);
    process.exit(1);
  }

  writeRunMd(stage, "PLAN", "COMPLETE");
  console.log(`✅ Stage ${stage} COMPLETE + APPROVED`);
}

async function main() {
  const stages = fs
    .readFileSync(ROADMAP, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stage of stages) {
    await runStage(stage);
  }

  console.log("\n🎉 All stages completed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
