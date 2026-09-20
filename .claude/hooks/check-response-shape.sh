#!/usr/bin/env bash
# PostToolUse hook: after a Write or Edit touches a file under server/routes/,
# check that every res.json(...) / res.status(x).json(...) call in that file
# includes success, data, and error keys, per CLAUDE.md's API Response Shape.
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
  if (!normalized.includes("server/routes/") || !normalized.endsWith(".js")) {
    process.exit(0);
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    process.exit(0);
  }

  const callRegex = /res(?:\.status\([^)]*\))?\.json\(/g;
  const violations = [];
  let match;

  while ((match = callRegex.exec(content)) !== null) {
    const openIdx = match.index + match[0].length - 1;
    let depth = 0;
    let closeIdx = -1;

    for (let i = openIdx; i < content.length; i++) {
      const ch = content[i];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) {
          closeIdx = i;
          break;
        }
      }
    }
    if (closeIdx === -1) continue;

    const argSpan = content.slice(openIdx + 1, closeIdx);
    const lineNumber = content.slice(0, match.index).split("\n").length;

    const hasSuccess = /\bsuccess\s*:/.test(argSpan);
    const hasData = /\bdata\s*:/.test(argSpan);
    const hasError = /\berror\s*:/.test(argSpan);

    if (!(hasSuccess && hasData && hasError)) {
      const missing = [];
      if (!hasSuccess) missing.push("success");
      if (!hasData) missing.push("data");
      if (!hasError) missing.push("error");
      violations.push({ line: lineNumber, missing });
    }
  }

  if (violations.length > 0) {
    console.log("");
    console.log(`⚠️  Response-shape check (${filePath}):`);
    for (const v of violations) {
      console.log(
        `   Line ${v.line}: res.json(...) call is missing ${v.missing.join(", ")} — CLAUDE.md requires { success, data, error } on every endpoint.`
      );
    }
    console.log("   (warning only — nothing was blocked)");
    console.log("");
  }

  process.exit(0);
});
' <<< "$INPUT"

exit 0
