---
description: Walk through writing a manual test case and save it under tests/manual/
---

Walk the user through creating a manual test case, step by step, one question at a time. Don't ask everything at once.

Collect:
1. **Title** — short name for what's being tested.
2. **Preconditions** — anything that must be true before starting (state, data, login status). "None" is fine.
3. **Steps** — the numbered actions to perform.
4. **Expected result** — what should happen if it works.
5. **Severity** — critical, major, minor, or trivial (default to major if the user isn't sure).
   - Critical: the app is unusable or data is lost/corrupted; no workaround exists.
   - Major: a core feature is broken or badly degraded; a workaround may exist but is painful.
   - Minor: a non-core feature or edge case is broken; easy to work around.
   - Trivial: cosmetic or wording issue with no functional impact.

Once you have all of this, generate a filename by slugifying the title (lowercase, spaces to hyphens, strip punctuation), e.g. "Login with valid credentials" -> `login-with-valid-credentials.md`.

Save the test case to `tests/manual/<slug>.md` using this template:

```markdown
# <Title>

## Preconditions

<preconditions, or "None">

## Steps

1. <step 1>
2. <step 2>
...

## Expected Result

<expected result>

## Severity

<severity>

## Status

Draft
```

A freshly created test case starts with status **Draft**. (Full status set: draft, ready, passed, failed, skipped — later stages are set when the test is actually run, not by this command.)

If `tests/manual/` doesn't exist yet, create it. If a file with the same slug already exists, ask the user whether to overwrite it or pick a different name before writing.

After saving, tell the user the file path and show a brief summary of what was recorded.
