import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import OpenAI from "openai";

// 1) Load env (YOUR KEY IS IN apps/.env)
dotenv.config({ path: path.resolve(process.cwd(), "apps/.env") });

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Put it in apps/.env (OPENAI_API_KEY=...).");
  process.exit(1);
}

// 2) Read Claude's report (you can rename these paths later)
const reviewPath = path.resolve(process.cwd(), "apps/handoff/review.md");
const approvalPath = path.resolve(process.cwd(), "apps/handoff/approval.md");

if (!fs.existsSync(reviewPath)) {
  console.error("Missing handoff/review.md. Claude should write the stage report there.");
  process.exit(1);
}

const reviewMd = fs.readFileSync(reviewPath, "utf8");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 3) Ask GPT to output ONLY a machine-parseable approval block
const prompt = `
You are a strict stage reviewer for a production SaaS repo.

Rules:
- Respond ONLY with a single \`\`\`approval\`\`\` block.
- status must be exactly one of: APPROVE, REVISE, BLOCK
- scope must be the stage id (e.g., stage-a1)
- If REVISE, include notes that describe the exact required changes.
- If APPROVE, include final_commands if present in the report, otherwise leave as an empty list.
- Never include secrets.

Here is the stage report:
${reviewMd}
`;

const res = await client.chat.completions.create({
  model: "gpt-4.1", // safe default; you can change later
  messages: [
    { role: "system", content: "Return ONLY the approval block. No extra text." },
    { role: "user", content: prompt },
  ],
});

const out = res.choices?.[0]?.message?.content ?? "";

if (!out.includes("```approval")) {
  console.error("Model did not return an approval block. Output was:\n", out);
  process.exit(1);
}

// 4) Write approval for Claude/runner to consume
fs.writeFileSync(approvalPath, out.trim() + "\n", "utf8");
console.log("Wrote approval to:", approvalPath);
