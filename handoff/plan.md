```plan
id: bootstrap-01
intent: "Bootstrap the runbook loop"
proposed_actions:
  - "Confirm repo name + how to run tests locally"
  - "Pick a small safe task to validate the loop (e.g. run tests, lint, or add a tiny TODO fix)"
proposed_commands:
  - "pwd"
  - "ls"
  - "git status"
  - "node -v || python --version || ruby -v"
  - "pnpm -v || npm -v"
risks:
  - "None (read-only commands)"
needs_approval: true
