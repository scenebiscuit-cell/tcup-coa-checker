# TCUP COA Checker: notes for Claude Code

The project's rules are shared with GitHub Copilot and live in one file, imported here:

@.github/copilot-instructions.md

Everything in that file applies to Claude Code too, especially the hard rules: no build step or dependencies, reading and judging kept separate, no regulatory value changed without an official source, and only fictional COAs in the repository.

## Working with Nick

- He knows HTML and CSS well and is still learning JavaScript. Explain each change in one or two plain sentences, and end each step with how to check that it worked.
- One small, testable step at a time. Run `npm test` after every change (use `npm.cmd test` if PowerShell blocks `npm`).
- He's on Windows: give PowerShell commands and Windows paths.
- Don't commit or push unless he asks. When he does, use a short imperative commit message and show `git status` first.

## The sibling repository

`coa-crosscheck` shares the parser block in `src/core.js` (from `/* ---------- cannabinoid names` to `/* ---------- the AI extraction prompt`). It's usually cloned next to this one, at `../coa-crosscheck`. After changing that block here, copy it there and run its tests too; if that folder isn't there, remind Nick to do it.

## Shortcuts

- `/add-lab-layout`: teach the parser a new lab's COA layout, test first.
- `/update-rule`: change a regulatory value with an official source and a test.
