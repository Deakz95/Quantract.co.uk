from pathlib import Path
import subprocess
import json
import time
import sys

# =========================
# CONFIG
# =========================

# Your specs folder
SPECS_DIR = Path("apps/crm/docs/specs")

# State file to track completed specs
STATE_FILE = Path(".ai-loop-state.json")

# Verification commands (run after each spec)
VERIFY_COMMANDS = [
    ["pnpm", "-C", "apps/crm", "tsc"],
    ["pnpm", "-C", "apps/crm", "build"],
]

# =========================
# HELPERS
# =========================

def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"done": []}

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2))

def get_next_spec(done):
    specs = sorted(SPECS_DIR.glob("*.md"))
    for spec in specs:
        if spec.name not in done:
            return spec
    return None

def run_cmd(cmd):
    print(f"\n$ {' '.join(cmd)}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    output = (r.stdout or "") + (r.stderr or "")
    print(output)
    return r.returncode, output

def run_claude(prompt: str):
    cmd = [
        "claude",
        "-p",
        "--permission-mode",
        "acceptEdits",
        "--add-dir",
        ".",
    ]
    # IMPORTANT: send the prompt via stdin to avoid Windows argv length limits
    r = subprocess.run(cmd, input=prompt, capture_output=True, text=True)
    output = (r.stdout or "") + (r.stderr or "")
    print(f"\n$ {' '.join(cmd)}")
    print(output)
    return r.returncode, output

# =========================
# MAIN LOOP
# =========================

def main():
    if not SPECS_DIR.exists():
        print(f"❌ Specs folder not found: {SPECS_DIR}")
        sys.exit(1)

    state = load_state()

    while True:
        spec = get_next_spec(state["done"])
        if not spec:
            print("\n🎉 All specs completed.")
            return

        print(f"\n=== Processing spec: {spec.name} ===")

        spec_text = spec.read_text(encoding="utf-8")

        prompt = f"""
You are a senior coding agent working in a monorepo.

RULES:
- Implement ONLY what this spec asks.
- Do NOT work ahead.
- Make minimal, safe changes.
- Respect existing architecture and patterns.
- If something is unclear, stop and explain instead of guessing.

After making changes, output:
1) Summary
2) Files modified
3) Commands run
4) Verification results
5) Risks / follow-ups

SPEC:
{spec_text}
"""

        # 1) Run Claude
        code, out = run_claude(prompt)
        if code != 0:
            print("❌ Claude execution failed. Stopping.")
            return

        # 2) Run verification
        for cmd in VERIFY_COMMANDS:
            rc, _ = run_cmd(cmd)
            if rc != 0:
                print("❌ Verification failed. Fix before continuing.")
                return

        # 3) Mark spec done
        state["done"].append(spec.name)
        save_state(state)
        print(f"✅ Completed {spec.name}")

        time.sleep(1)

if __name__ == "__main__":
    main()
