#!/usr/bin/env bash
# PostToolUse hook: after a Write or Edit touches a JS/TS/React file, scan its
# content for common wrong severity words (high/medium/low/blocker/cosmetic)
# instead of CLAUDE.md's actual enum (critical/major/minor/trivial).
# Warn-only: never blocks, always exits 0.

set -u

INPUT="$(cat)"

node -e '
const fs = require("fs");

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

  const toolName = input.tool_name || "";
  if (toolName !== "Write" && toolName !== "Edit") process.exit(0);

  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  const normalized = filePath.replace(/\\/g, "/");
  if (!/\.(js|jsx|ts|tsx)$/.test(normalized)) process.exit(0);

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    process.exit(0);
  }

  const WRONG_WORDS = ["high", "medium", "low", "blocker", "cosmetic"];
  const lines = content.split("\n");
  const hits = [];

  lines.forEach((lineText, idx) => {
    for (const word of WRONG_WORDS) {
      const wordRegex = new RegExp(`\\b${word}\\b`, "i");
      if (wordRegex.test(lineText)) {
        hits.push({ line: idx + 1, word, text: lineText.trim().slice(0, 80) });
      }
    }
  });

  if (hits.length > 0) {
    console.log("");
    console.log(`⚠️  Severity-word check (${filePath}):`);
    for (const h of hits) {
      console.log(
        `   Line ${h.line}: found "${h.word}" — CLAUDE.md severity levels are critical, major, minor, trivial only. (${h.text})`
      );
    }
    console.log("   (warning only — nothing was blocked)");
    console.log("");
  }

  process.exit(0);
});
' <<< "$INPUT"

exit 0
