---
description: Change a Texas TCUP limit or citation, with an official source and tests
argument-hint: The value that changed and the link to the new statute or rule
---


Update a Texas regulatory value in this project. Follow the hard rules in CLAUDE.md and `.github/copilot-instructions.md`, especially: never change a number without an official source.

What changed: $ARGUMENTS

Steps:

1. **Confirm the source.** Open the link I gave. Quote the exact sentence that sets the value and give the section number. If the link isn't an official source (Texas Legislature Online, the Texas Administrative Code, or Texas DPS), stop and ask me for one.
2. **Find every place the value is used:** `evaluate` and `CITE` in `src/core.js`, the limit cards and notes in `index.html`, and `README.md`.
3. **Write or update a test** in `tests/core.test.js` that would fail with the old value and pass with the new one. Run it and show it failing.
4. **Make the change** in code, citations, page text, and README.
5. **Run `npm test`** and make sure everything passes.
6. **Remind me** that the multi-state repo (`coa-crosscheck`) has its own Texas rulebook in `src/rules.js` and `docs/VERIFY.md`, which needs the same change.
7. **Summarize** what changed, the quoted rule text, anything you couldn't confirm, and a suggested commit message.
