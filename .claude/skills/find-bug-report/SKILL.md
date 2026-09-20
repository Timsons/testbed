---
name: find-bug-report
description: Search existing bug reports under tests/bugs/ for a match before a new one is filed. Triggers right before /bug-report runs, or whenever the user describes a bug, issue, error, or problem they've hit and seems about to report it. Shows up to 5 candidate existing reports so the user can pick one instead of creating a duplicate.
allowed-tools: Read, Grep, Glob
---

Before a new bug report is created, check whether an existing one already covers it. This is a read-only search step that runs first — it never files, edits, or deletes anything itself.

## Step 1 — Get the description to match against

Use whatever description of the issue is already available: the user's own words, or, if this is running as part of `/bug-report`, whatever Title/Steps to Reproduce/Expected/Actual have been collected so far — even partial answers are enough to search with.

If nothing about the bug has been described yet, ask for a one- or two-sentence description before searching. There's nothing to match against otherwise.

## Step 2 — Search tests/bugs/

Use Glob to list the files in `tests/bugs/`. If the folder is empty or doesn't exist, say so and stop here — proceed straight to filing a new report.

Otherwise, pull the key nouns/verbs out of the new description (the feature or area involved, the action being performed, the symptom observed) and Grep the existing files' Title, Steps to Reproduce, Expected, and Actual sections for overlap, case-insensitively. Read the full contents of any file with plausible overlap — judge on feature/area and symptom similarity, not just a single shared word.

## Step 3 — Shortlist

Keep only genuinely plausible matches — same feature area and a similar symptom, not a coincidental shared term. Rank by closeness of match. Show at most 5.

## Step 4 — Present to the user

If one or more plausible matches exist, list each with: filename, Title, Severity, Status, and a one-line summary drawn from Steps to Reproduce/Actual. Ask whether any of them match what the user is seeing.

If nothing plausible turns up, say so in one line ("No existing bug report looks like a match.") and move straight on.

## Step 5 — Hand off

- **User picks an existing match:** don't create a new file. Show them that report and suggest `/bug-report-edit` if they want to add detail, bump its status, or update it — do not proceed to file a duplicate.
- **User confirms it's new, or nothing matched:** proceed to `/bug-report` to file it as usual.
