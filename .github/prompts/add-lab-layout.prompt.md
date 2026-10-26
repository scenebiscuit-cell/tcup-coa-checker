---
description: Teach the built-in parser a new lab's COA layout, test first
agent: agent
argument-hint: Paste the COA text (or name the PDF) and say what it misreads
---

Teach the built-in COA parser a new lab layout. Follow the parser rules in [copilot-instructions.md](../copilot-instructions.md).

The COA and the problem: ${input:coa:Paste the COA text and describe what the checker read wrong}

Work in these steps and stop after each one to show me what changed:

1. **Diagnose.** Run the text through `CORE.parseText` in Node and show which fields, cannabinoids, panels, or analytes are missing or wrong. Name the layout pattern that causes it (for example "single-spaced rows", "units only in a second header row", "two fields on one line").
2. **Write a fictional fixture** in `tests/fixtures/` that reproduces the same layout with invented lab, product, and client names and made-up numbers. Never copy the real COA's names, license numbers, or results into the repository.
3. **Write the failing test** in `tests/layouts.test.js`: assert the fields that were wrong, the cannabinoid values and units, the panel statuses, and one `evaluate` result. Run `npm test` and confirm it fails for the expected reason.
4. **Fix `parseText`** in `src/core.js` with the smallest change that works. Prefer extending an existing pattern (`LABEL_NAMES`, `SECTION_NAME`, `HEADER_FIRST`, `VALUE_TOKEN`, `CANNABINOIDS`) over a new special case. Comment any new regex with an example of the text it matches.
5. **Run `npm test`.** All tests must pass, including every older fixture. If an older one breaks, rework the fix instead of changing that test.
6. **Copy the parser block to the multi-state repo** (`coa-crosscheck/src/core.js`, from `/* ---------- cannabinoid names` to `/* ---------- the AI extraction prompt`), copy the fixture, and run its tests too, if that repo is open in this workspace. If it isn't, remind me to do it.
7. **Summarize** in plain language: what the lab's layout does differently, what the parser now handles, and a suggested commit message.
