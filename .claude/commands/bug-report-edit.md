---
description: Edit an existing bug report in tests/bugs/ and stamp it with a last-edited timestamp
---

Walk the user through editing an existing bug report, step by step. Don't ask everything at once.

1. **Find the report.** List the files in `tests/bugs/` (filename + the title from each file's `# <Title>` heading) so the user can see what's available. If there's only one file, still show it and ask the user to confirm that's the one to edit. If there are none, tell the user and stop — nothing to edit.

2. **Load and display it.** Once the user picks a file, read it and show its current field values clearly (Title, Steps to Reproduce, Expected, Actual, Severity, Environment, Status) so the user knows what's there before deciding what to change.

3. **Ask what to edit.** Ask which field(s) the user wants to change. They can name one, several, or "all". Supported fields:
   - Title
   - Steps to Reproduce
   - Expected
   - Actual
   - Severity — critical, major, minor, or trivial
   - Environment — one of: Web Chrome, Android Chrome, iOS Chrome, iOS Safari
   - Status — open, in-progress, resolved, closed, or reopened

4. **Collect new values one at a time.** For each field the user wants to change, show the current value and ask for the replacement. Leave every other field untouched.

5. **Update the file:**
   - Apply the new values to the matching sections.
   - Add or update a `## Last Edited` section (date and time, e.g. `2026-09-19 14:32`) directly under the `# <Title>` heading, before the other sections. If a `## Last Edited` section already exists, overwrite its value — don't stack multiple.
   - Keep the filename unchanged, even if the title changes — the file is dated and the name should stay stable so links/references to it don't break. If the title changes, only update the `# <Title>` heading text inside the file.

6. **Confirm.** After saving, tell the user the file path, show the fields that changed (old → new), and confirm the last-edited timestamp was recorded.
