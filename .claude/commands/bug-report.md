---
description: Walk through filing a bug report and save it as a dated file under tests/bugs/
---

Before asking anything else, invoke the `find-bug-report` skill with whatever description of the bug the user has given so far (even just their initial message). If it surfaces a plausible existing match and the user confirms it's the same issue, stop here — don't file a new report. Only continue below once it's confirmed there's no existing match, or the user explicitly wants a new report anyway.

Walk the user through filing a bug report, step by step, one question at a time. Don't ask everything at once.

Collect:
1. **Title** — short summary of the bug.
2. **Steps to reproduce** — the numbered actions that trigger the bug.
3. **Expected** — what should have happened.
4. **Actual** — what actually happened instead.
5. **Severity** — critical, major, minor, or trivial (default to major if the user isn't sure).
   - Critical: the app is unusable or data is lost/corrupted; no workaround exists.
   - Major: a core feature is broken or badly degraded; a workaround may exist but is painful.
   - Minor: a non-core feature or edge case is broken; easy to work around.
   - Trivial: cosmetic or wording issue with no functional impact.
6. **Environment** — one of: Web Chrome, Android Chrome, iOS Chrome, iOS Safari. Ask the user to pick one; don't accept anything outside this list.

Once you have all of this, generate a filename as `<today's date in YYYY-MM-DD>-<slug>.md`, where slug is the title lowercased, spaces turned to hyphens, punctuation stripped. E.g. "Login button does nothing" on 2026-09-19 -> `2026-09-19-login-button-does-nothing.md`.

Save the bug report to `tests/bugs/<filename>` using this template:

```markdown
# <Title>

## Steps to Reproduce

1. <step 1>
2. <step 2>
...

## Expected

<expected>

## Actual

<actual>

## Severity

<severity>

## Environment

<environment>

## Status

Open
```

A freshly filed bug starts with status **Open**. (Full status set: open, in-progress, resolved, closed, reopened — later stages are set as the bug is worked, not by this command.)

If `tests/bugs/` doesn't exist yet, create it. If a file with the same name already exists, ask the user whether to overwrite it or pick a different name before writing.

After saving, tell the user the file path and show a brief summary of what was recorded.
