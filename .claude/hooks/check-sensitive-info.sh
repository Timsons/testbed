#!/usr/bin/env bash
# UserPromptSubmit hook: blocks the prompt if it looks like it contains
# sensitive info — API keys/tokens, private keys, or PII (email, SSN,
# phone, credit card). Unlike the PostToolUse warn-only hooks, this one
# actually blocks (exit code 2) since its whole purpose is to stop
# sensitive content before it ever reaches the model.

set -u

INPUT="$(cat)"

node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const prompt = input.prompt || "";
  if (!prompt) process.exit(0);

  const PATTERNS = [
    { label: "AWS access key", regex: /AKIA[0-9A-Z]{16}/ },
    { label: "GitHub personal access token", regex: /gh[pousr]_[A-Za-z0-9]{36,}/ },
    { label: "Slack token", regex: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
    { label: "Discord webhook URL", regex: /discord\.com\/api\/webhooks\/\d+\/[\w-]+/ },
    { label: "JWT", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
    { label: "private key block", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { label: "OpenAI-style API key", regex: /sk-[A-Za-z0-9]{20,}/ },
    { label: "Stripe key", regex: /sk_(live|test)_[A-Za-z0-9]{10,}/ },
    { label: "Bearer token", regex: /Bearer\s+[A-Za-z0-9\-_.]{20,}/ },
    { label: "generic secret assignment", regex: /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["\x27]?[A-Za-z0-9_\-]{12,}/i },
    { label: "email address", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
    { label: "US Social Security Number", regex: /\b\d{3}-\d{2}-\d{4}\b/ },
    { label: "phone number", regex: /\b(\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/ },
    { label: "international phone number", regex: /\+\d{7,15}\b/ },
    { label: "credit card number", regex: /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/ },
  ];

  const hits = [];
  for (const p of PATTERNS) {
    if (p.regex.test(prompt)) hits.push(p.label);
  }

  if (hits.length > 0) {
    console.error(
      "Blocked: this prompt looks like it contains sensitive information (" +
        hits.join(", ") +
        "). Remove it and resend, or rephrase without the raw value."
    );
    process.exit(2);
  }

  process.exit(0);
});
' <<< "$INPUT"
