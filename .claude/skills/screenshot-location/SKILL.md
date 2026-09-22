---
name: screenshot-location
description: Whenever a screenshot is captured anywhere in this project — via headless Chrome CLI flags, Playwright MCP's browser_take_screenshot, or any other means — save it into the project's tmp/ folder, never the project root, the repo root, or a tool's own default output folder. Trigger this any time you're about to take, save, name, or move a screenshot, page capture, or visual snapshot in this repo, even if the request doesn't mention "tmp" or a save location at all.
allowed-tools: Bash, Read
---

Every screenshot taken in this project belongs in `tmp/` at the project root, and only there. This is a standing preference the user set explicitly after screenshots kept landing in the project root or a tool's own default folder — don't ask again, just apply it.

## Before capturing a screenshot

Point whatever tool you're using directly at a `tmp/` path so nothing needs to be moved afterward:

- **Headless Chrome CLI** (`--screenshot=`): set the flag to `tmp/<descriptive-name>.png`, e.g. `--screenshot=tmp/dashboard-dark.png`.
- **Playwright MCP** (`browser_take_screenshot`): pass `filename: "tmp/<descriptive-name>.png"`. Left unset, it defaults to its own `.playwright-mcp/` output folder — don't leave it unset.
- **Any other tool or script**: same rule — the output path argument should start with `tmp/`.

## If a screenshot already landed somewhere else

Some tools don't take an output-path argument at all, or a script defaulted elsewhere anyway. If that happens, move the file into `tmp/` right after capture (`mv <file> tmp/`) rather than leaving it in the project root or wherever the tool put it.

## Naming

Use a short, descriptive filename that says what's in the shot (e.g. `tmp/test-cases-dark-mode.png`, `tmp/settings-explicit-light.png`) rather than a generic one like `screenshot.png` — this folder accumulates screenshots across a session, and generic names become useless once there are three of them.

`tmp/` is already in `.gitignore`, so none of this ever gets committed — it's scratch space, not deliverables.
