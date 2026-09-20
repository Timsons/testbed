---
name: test-generator
description: Generate manual test cases whenever the user asks for test cases, test scenarios, edge cases, coverage, or ISTQB-style tests for a feature, field, or input. Applies boundary-value analysis, equivalence partitioning, and negative testing, and writes each case in the exact shape defined in CLAUDE.md (Title, Preconditions, Steps, Expected Result, Severity, Status).
---

Generate manual test cases for whatever feature, field, or input the user names, using ISTQB test design techniques to get real coverage — not just the happy path — and write each case in the exact shape defined in this project's `CLAUDE.md`.

## Step 1 — Understand the input

Identify what's being tested: the field(s) or input(s) involved, their type (text, number, date, file, etc.), any stated constraints (min/max length, numeric range, required/optional, uniqueness), and the valid vs. invalid values that follow from them.

If a constraint needed for boundary or negative testing isn't stated or discoverable from the conversation, code, or CLAUDE.md (e.g. "test the username field" with no stated length limit), ask the user for it before generating those cases — don't invent a boundary that isn't real.

## Step 2 — Cover all of these categories

Generate at least one test case per applicable category below. Skip a category only if it genuinely doesn't apply to this input (e.g. "duplicate" doesn't apply to a field with no uniqueness constraint) — say so rather than silently omitting it.

**Happy path**
- One or more cases with typical, clearly valid input, exercising the normal successful flow end to end.

**Boundary values (BVA)**
For each bounded input, test:
- **min** and **max** (the boundary values themselves — valid)
- **min − 1** and **max + 1** (just outside the boundary — invalid)
- **empty** (zero-length input, if the field allows submitting it at all)
- **whitespace-only** (e.g. a string of only spaces — distinct from empty)
- **very long** (well beyond max, e.g. 10x the limit or a very large string, to check truncation/overflow handling, not just off-by-one)

**Equivalence partitions**
- Identify the distinct valid and invalid partitions of the input domain beyond the boundaries themselves (e.g. for an email field: valid partition "well-formed address", invalid partitions "missing @", "missing domain", "invalid characters").
- One representative test case per partition is enough — don't enumerate every value in a partition.

**Negative cases**
- **Wrong type** — e.g. a number field given letters, a date field given a malformed date.
- **Missing required field** — the input omitted entirely where it's mandatory.
- **Duplicate** — submitting a value that violates a uniqueness constraint, if one exists (e.g. an email or username that's already taken).

## Step 3 — Write each test case in the CLAUDE.md shape

Every test case uses exactly these fields, no more, no fewer:

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

- **Title** — name the specific condition being tested, e.g. "Username field rejects input below minimum length (min − 1)" or "Signup rejects duplicate email address".
- **Preconditions** — state that must hold before starting; "None" if not applicable.
- **Steps** — numbered actions, ending with entering/submitting the value under test.
- **Expected Result** — the correct behavior for that condition (acceptance for valid values and partitions; rejection with the correct error for invalid ones, boundaries just outside range, wrong types, missing fields, and duplicates).
- **Severity** — critical, major, minor, or trivial, per CLAUDE.md's definitions. Letting invalid data through or blocking valid data is usually Major; a cosmetic edge case (e.g. UI truncation at max length) is usually Minor or Trivial.
- **Status** — always `Draft` for freshly generated cases.

Follow CLAUDE.md's Voice section: clear, direct English, no buzzwords, no filler, no hedging.

## Step 4 — Present and offer to save

Show the user the full set of generated test cases, grouped by category (Happy Path / Boundary Values / Equivalence Partitions / Negative Cases) so coverage is easy to scan. Then offer to save them under `tests/manual/`, one file per test case, filename = the title slugified (lowercase, spaces to hyphens, punctuation stripped) — matching the format the `/new-test` command produces. Only write the files if the user confirms; if a filename would collide with an existing file, ask before overwriting.
