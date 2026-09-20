# CLAUDE.md

## Stack

Express (server/, entry at server/index.js) + React via Vite (client/, source in client/src/), run together with `npm run dev` from the root.

## Severity Levels

- **Critical** — the app is unusable or data is lost/corrupted; no workaround exists.
- **Major** — a core feature is broken or badly degraded; a workaround may exist but is painful.
- **Minor** — a non-core feature or edge case is broken; easy to work around.
- **Trivial** — cosmetic or wording issue with no functional impact.

## Test Case Fields

- **Title** — short name for what's being tested.
- **Preconditions** — state that must hold before the test starts ("None" if not applicable).
- **Steps** — numbered actions to perform.
- **Expected Result** — what should happen if the test passes.
- **Severity** — critical, major, minor, or trivial.
- **Status** — draft, ready, passed, failed, or skipped.

## Environments

- Web Chrome
- Android Chrome
- iOS Chrome
- iOS Safari

## Bug Report Fields

- **Title** — short summary of the bug.
- **Steps to Reproduce** — numbered actions that trigger the bug.
- **Expected** — what should have happened.
- **Actual** — what actually happened.
- **Severity** — critical, major, minor, or trivial.
- **Environment** — one of the Environments listed above.
- **Status** — open, in-progress, resolved, closed, or reopened.

## API Response Shape

Every endpoint returns:

```json
{ "success": boolean, "data": any, "error": string | null }
```

## File Naming

- Files: kebab-case (`user-profile.js`).
- React components: PascalCase (`UserProfile.jsx`).
- API handlers: `handleVerbNoun` (`handleCreateUser`, `handleGetOrders`).

## Voice

Write all generated test cases and bug reports in clear, direct English. No buzzwords, no filler, no hedging. State what happens, not what might happen.
