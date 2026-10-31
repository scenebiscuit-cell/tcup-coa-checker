# Instructions for GitHub Copilot: TCUP COA Checker

Read this before changing anything in this repository.

## What this project is

A static web page that checks a cannabis lab **certificate of analysis (COA)** against the rules of the **Texas Compassionate Use Program (TCUP)** and gives a verdict (Clear, Review, or Hold). Every finding cites the statute or rule it comes from. It's a portfolio project by Nick Lax, hosted on GitHub Pages at https://scenebiscuit-cell.github.io/tcup-coa-checker/. It is not legal advice. A multi-state version lives in `scenebiscuit-cell/coa-crosscheck`.

The owner knows HTML and CSS well and is still learning JavaScript. Explain JavaScript changes in plain language, keep them small, and do one testable step at a time. He works on Windows, so give PowerShell commands.

## Hard rules

1. **No build step and no dependencies.** Plain HTML, CSS, and vanilla JavaScript in `<script>` tags. Don't add npm packages, frameworks, bundlers, or TypeScript. External scripts load only from cdnjs with an exact version (pdf.js 3.11.174 is the only one).
2. **Reading and judging stay separate.** The parser turns COA text into structured fields. The rules engine turns fields plus a rulebook into findings. Never put compliance logic in the parser, and never put COA-format guessing in the engine.
3. **Never change a regulatory number without a source.** The Texas limits (10 mg THC per dosage unit, 1 g per package) and their citations live in `evaluate` and the `CITE` table in `src/core.js`. Every citation needs a working link to the official statute or rule (Texas Legislature Online, Texas Administrative Code, or DPS). If you can't confirm a value from an official source, say so and leave it alone. Don't state thresholds from memory. Update the README's "What it checks" table and the page's notes to match.
4. **When a rule is unclear, flag it for review instead of failing it.** Use a `warn` check that explains the open question. Example: fungicide and fertilizer gaps are "review" because labs rarely itemize fertilizers, even though 37 TAC §12.7(b) lists both.
5. **Every compliance finding needs a citation.** Checks are added with `add(id, status, title, detail, citeKey)`, where `citeKey` names an entry in `CITE`; status is `pass`, `warn`, `fail`, or `info`.
6. **Fixtures are fictional.** Never commit a real COA, real client names, or real license numbers. Copy the *layout* of a real COA into an invented one in `tests/fixtures/`.
7. **Don't weaken or delete tests to make them pass.** Fix the code, or explain why the test was wrong.
8. **Keep the parser in sync with the multi-state repo.** `scenebiscuit-cell/coa-crosscheck` uses the same code in `src/core.js` from `/* ---------- cannabinoid names` up to `/* ---------- the AI extraction prompt`. When you change that block here, copy it there too and run its tests.

## Files

| File | What it holds | Notes |
|---|---|---|
| `src/core.js` | Parser (`parseText`, `joinLine`), AI extraction prompt and schema, THC math (`thcMath`), Texas rules engine (`evaluate`) and its `CITE` table | Pure functions, no DOM. Exports `CORE` for the browser and Node. |
| `src/samples.js` | Fictional sample COAs for the sample buttons | |
| `src/app.js` | The interface: file upload with pdf.js, local Ollama reader, report rendering | The only file that touches the DOM. |
| `src/styles.css` | All styles, with color tokens on `:root` and dark-mode overrides | |
| `tests/*.test.js` | Unit tests run with `node --test` | |
| `tests/fixtures/` | Fictional COAs, one per lab layout | |

## How the parser works (`parseText` in `src/core.js`)

Labs don't share a COA layout and no state standardizes one, so the parser looks for patterns that recur across labs.

**PDF text first.** A PDF stores text in drawing order, which isn't always reading order. `pdfText` (in the shared block) rebuilds each page two ways, by position (`pdfLines`: top to bottom, left to right) and in drawing order (`streamLines`), and keeps whichever one `parseText` reads more from (`readScore`). Both join superscripts back into names ("∆" "9" "-THC"), drop rotated watermark text, and undo letter-spaced text ("T H C A" becomes "THCA"; the spaces between words are lost in that case). `app.js` only collects the pdf.js pieces and calls `CORE.pdfText`.

Then, in order:

1. **CSV exports** (`fromCsv`) become tab-separated rows. A "Section, Analyte, Result, ..." export becomes a header line per section.
2. **Fields** like `Batch: A1` are found with `field()` over *segments*: lines split at wide gaps and in front of known labels (`LABEL_NAMES`), with a bare `Label:` taking its value from the next line, and a row of bare labels taking its values from the row under it. With no labeled name, the product name is read from the line over a describing line ("Edible, Beverage, Hemp Cannabis") or just under the title. The lab can come from the fine print ("tested by ..."). To support a new field label, add it to `LABEL_NAMES` and to the matching `field(...)` pattern.
3. **Table rows** are split by `cellsOf()`: tabs, pipes, or 2+ spaces separate cells. With single spaces only, value-like tokens (`VALUE_TOKEN`) are read off the end of the line and the rest is the name.
4. **Sections** start at a header (`SECTION_NAME`, all-caps lines, `Name — PASS`), a status on the next line (`STATUS_LINE`), a one-line summary with several "Section Status" pairs, or a summary grid (a row of names over a row of statuses).
5. **Table headers** (`readHeader`) set the column order. A header can start after text from another column of the page, wrap its units onto the next line, be stacked one word per line (read back with `COL_PHRASE`), have no section title above it (the section comes from its first column, a title just above, or its first row), or hold two tables side by side (`pair`). LOD, LOQ, dilution, uncertainty, and trailing notes columns are skipped. Units can come from the header (`Result (ppm)`), a units row underneath, or the value itself (`11.05mg/g`). Extra cells after a row (a chart legend) and footer lines after a table (an address) are left out.
6. **Potency** comes from sideways tables (names in a row, unit rows under them) or row tables. When several unit columns exist, the parser prefers mg/unit, then mg/package, mg/mL, mg/g, and %.
7. **Cannabinoid names**, both abbreviations and chemical names, map to keys in `CANNABINOIDS`. Order matters: acids before their neutral forms. Rows that restate a value per serving or package (`PER_ROW`) aren't extra cannabinoids.
8. **Totals** can sit beside, under, or over their label ("75.13%" over "Total THC"), including a row of values over a row of labels.

The self-checks in `evaluate` (`read` check) catch misreads: impossible values, and THC rows that don't add up to the lab's printed total.

## Adding support for a new lab layout

Use the prompt file `.github/prompts/add-lab-layout.prompt.md` (type `/add-lab-layout` in Copilot Chat). The short version:

1. Write a fictional fixture in `tests/fixtures/` that copies the layout (spacing, column order, wording), not the data.
2. Add a test in `tests/layouts.test.js` that asserts the fields, cannabinoids, panels, and one evaluation result. Run it and watch it fail.
3. Make the smallest change to `parseText` that makes it pass.
4. Run `npm test`. Every existing fixture must still pass, because a fix for one lab often breaks another.

## Commands (PowerShell)

```powershell
npm test                       # all unit tests; Node 18 or newer
npx serve .                    # or: python -m http.server 8000
```

## Style

- Match the existing code: 2-space indent, double quotes, semicolons, `const`/`let`, small pure functions.
- Comments explain *why*, in plain English. Each regex that guesses at a lab format gets a comment with an example of the text it's for.
- Interface text is plain and specific. Keep the footer credit "Created by Nick Lax".
- Accessibility is required: WCAG 2.2 AA in light and dark themes, visible focus, keyboard-reachable tooltips, 24 px minimum tap targets, and no motion when the user prefers reduced motion. Use the color tokens in `styles.css`, not new hex values.
- **Cache-busting:** `index.html` loads every script, stylesheet, and icon with `?v=<date>`. When you change any of those files, bump that date everywhere in `index.html` (for example `?v=2026-11-02`), so visitors' browsers fetch the new copy instead of a saved old one.
- Commit messages: imperative, under 72 characters ("Read potency tables with LOQ columns").
