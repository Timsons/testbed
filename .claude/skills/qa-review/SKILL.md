---
name: qa-review
description: Review code or a feature from a QA/tester's perspective whenever the user asks for a QA review, quality review, testability review, or to check a feature for issues before it ships. Reports missing validation, missing error handling, unclear user messages, missing confirmation dialogs, and accessibility issues, grouped by CLAUDE.md severity (critical/major/minor/trivial).
allowed-tools: Read, Grep
---

Review the code or feature the user names — or, if none is named, whatever was most recently changed — from a tester's angle: not "does it work," but "what happens when it's used wrong, used carelessly, or used by someone with different needs." This is a read-only audit: report issues, don't fix them.

## Step 1 — Establish scope

Use Grep to locate the relevant files (routes, components, handlers) for the named feature, then Read them in full. If the user didn't name a feature, ask which one, or default to the most recently discussed/changed feature in the conversation.

## Step 2 — Check for these issue types

For every user-facing input, action, and state, check for:

**Missing validation**
- Required fields not enforced (client-side, server-side, or both).
- No type, format, or length checks on input.
- Boundaries not handled (empty, too long, wrong type) — the kind of thing boundary-value analysis would catch.

**Missing error handling**
- API calls with no `.catch` / try-catch, or errors swallowed silently.
- Network or server failures that leave the UI stuck (e.g. a spinner that never resolves) instead of surfacing the failure.
- Errors from one part of a flow that don't stop or roll back the rest of it.

**Unclear user messages**
- Generic messages ("Error", "Something went wrong") with no actionable detail.
- No feedback at all on success or failure — the user can't tell if the action worked.
- Validation errors that don't say which field is wrong or why.

**Missing confirmation dialogs for destructive actions**
- Delete, remove, reset, cancel, or overwrite actions that execute immediately with no confirmation step.
- Confirmations that exist but don't state what will be lost or that it's irreversible.

**Accessibility issues**
- Missing form labels, missing `alt` text on images, missing `aria-*` attributes on custom controls.
- Status or meaning conveyed by color alone (e.g. a severity badge with no text label).
- Interactive elements that aren't keyboard-operable (click-only handlers on non-button/non-link elements, dropdown menus that can't be opened or closed with the keyboard, no visible focus state).
- Insufficient color contrast for text or interactive elements.

If a category genuinely doesn't apply anywhere in scope, say so explicitly rather than omitting it silently.

## Step 3 — Classify severity

Use CLAUDE.md's four severity levels for every issue found:

- **Critical** — the app is unusable or data is lost/corrupted; no workaround exists.
- **Major** — a core feature is broken or badly degraded; a workaround may exist but is painful.
- **Minor** — a non-core feature or edge case is broken; easy to work around.
- **Trivial** — cosmetic or wording issue with no functional impact.

## Step 4 — Report

Output a structured list grouped by severity, Critical first, Trivial last. Omit a severity heading entirely if nothing in scope falls into it. For each issue:

- **Location** — file and line/section.
- **Issue** — what's missing or wrong, in one or two direct sentences (per CLAUDE.md's Voice: no buzzwords, no hedging).
- **Why it matters** — the concrete failure scenario a user or tester would hit.

Don't propose or make code changes — this skill only reports findings.
