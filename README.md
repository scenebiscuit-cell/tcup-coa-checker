# TCUP COA Checker

**Live demo:** https://scenebiscuit-cell.github.io/tcup-coa-checker/

A browser tool that reads a cannabis lab **certificate of analysis (COA)** and checks it against the rules of the **Texas Compassionate Use Program (TCUP)**, the state's medical cannabis program. Every finding links to the statute or rule it comes from.

![TCUP COA Checker showing a HOLD verdict for a gummy product that exceeds the 10 mg per-dose THC limit](docs/screenshot-desktop.png)

## Why I built it

Reviewing COAs is routine compliance work, and the problems tend to repeat: a missing test panel, a per-dose THC figure nobody calculated, a semi-synthetic cannabinoid on the potency table. This project combines my background in state cannabis compliance and enforcement with software. Software can do the tedious reading and math, while the compliance calls stay explicit and auditable.

## What it checks

| Check | Rule | Source |
|---|---|---|
| Required test panel: THC, CBD, residual solvents, pesticides, mold, heavy metals (fungicides and fertilizers flagged for review) | Every processed product must be tested for these | 37 TAC §12.7(b) |
| Contaminant results within limits | Each result is compared to the action limit printed on the COA | 37 TAC §12.7(b) |
| THC per dosage unit | No more than **10 mg** of tetrahydrocannabinols per dosage unit | Occ. Code §169.001(3), as amended by HB 46 (2025) |
| THC per package or device | No more than **1 g** of THC per package, container, or inhalation device | Health & Safety Code ch. 487, as amended by HB 46 |
| Phytocannabinoids only | Flags HHC, THC-O-acetate and similar, plus elevated Δ8-THC that suggests catalyst conversion | Health & Safety Code §487.1071 (HB 46) |
| Product form | Smokable products fail; inhaled products need a prescription and an approved device | Occ. Code §169.001, §169.006 |
| Traceability | Batch number and test date present to support the final label | 37 TAC §12.7(p) |

Each COA gets a verdict: **Clear**, **Review**, or **Hold**.

### Compliance details worth knowing

- **Total THC includes Δ8.** The statute caps "tetrahydrocannabinols," so the checker computes Δ9 + Δ8 + Δ10 + THCA × 0.877 instead of trusting the lab's printed total, which often leaves out Δ8.
- **The rule text is out of date.** Published copies of 37 TAC §12.7(q) still read 0.5% THC / 10% CBD by weight. HB 46 replaced that standard in statute with per-dose and per-package limits, and the checker applies the statute.
- **Units are reconciled.** Potency reported in %, mg/g, mg/mL, or mg per unit is converted to mg per dose and mg per package using the product's unit size and package contents.

## How it works

```
COA (paste / PDF / photo)  →  reader  →  structured fields  →  rules engine  →  verdict + cited findings
                               │                ↑
       built-in parser, or an AI model     user can correct any field
       (local via Ollama, or Claude)
```

The design keeps reading and judging apart. Reading a COA is the hard, fuzzy part, because every lab formats its report differently. An AI model handles that well. Judging compliance has to be consistent and explainable, so it stays in plain code with a citation on every finding. Self-checks sit in between: they compare the THC rows to the lab's printed total and flag impossible values, so a misread shows up as a finding instead of a wrong verdict.

- **`src/core.js`** has the COA parser and the rules engine. The parser handles simple "Label: value" COAs and the layouts many real labs use: pass/fail status printed under each test name, sideways cannabinoid tables with wrapped column names, and result tables with their own column order. These are pure functions with no DOM access, so they're easy to test. All pass/fail decisions are deterministic code, so the same COA always gets the same verdict.
- **`src/app.js`** is the interface: sample loading, PDF text extraction with pdf.js, the optional local-model reader, editable product details, and the report.
- **`src/samples.js`** has three fictional COAs that exercise the clear, review, and hold paths.
- **`tests/core.test.js`** has unit tests for the THC math, unit conversion, each sample's verdict, and a fictional COA in a real-lab layout (`tests/fixtures/`).

The public demo runs entirely in the browser, and nothing is uploaded. It accepts COA PDFs that contain text (most lab-issued PDFs) and extracts the text with pdf.js. Scanned or photographed COAs have no text layer and need the AI version. A version of this tool runs inside Claude, where an AI model reads unfamiliar COA layouts, scanned PDFs, and photos into the same structured fields. The rules engine still makes every compliance call.

## Use a local AI model (Ollama)

The built-in parser covers simple and common lab layouts. For any layout, including scanned PDFs and phone photos, connect a model running on your own computer. The COA never leaves your machine.

1. Install [Ollama](https://ollama.com) and pull a model:
   ```bash
   ollama pull qwen2.5:14b      # text COAs and PDFs with text
   ollama pull qwen2.5vl:7b     # optional: scanned PDFs and photos
   ```
2. Allow the site to reach Ollama. This step isn't needed when you run the page from `http://localhost`. On Windows, in PowerShell:
   ```powershell
   setx OLLAMA_ORIGINS "https://YOUR-GITHUB-USERNAME.github.io"
   ```
   Then quit Ollama from the system tray and start it again. On macOS: `launchctl setenv OLLAMA_ORIGINS "https://YOUR-GITHUB-USERNAME.github.io"`, then restart Ollama.
3. On the page, open **Use a local AI model** and click **Connect**. If the browser asks to let the site reach apps on this device, allow it.

The page sends the COA text and a JSON schema to Ollama's `/api/chat`, streams the answer, and runs the same rules engine on the result. Reading time depends on your GPU and how many results the COA lists; the page shows progress as the model writes. Smaller local models misread more often than large hosted ones, which is why the self-checks and the "Lab results as read" table matter.

## Run it locally

No build step and no dependencies.

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/tcup-coa-checker.git
cd tcup-coa-checker
npx serve .        # or: python3 -m http.server
npm test           # Node 18+
```

<img src="docs/screenshot-mobile.png" alt="The compliance report on a phone in dark mode" width="280">

## Disclaimer

This is a portfolio prototype, not legal advice or a substitute for Texas DPS guidance. The sample COAs, labs, and companies are fictional. Rules reflect Texas law as of October 2026.

## Sources

- [37 TAC §12.7, Testing, Production, and Packaging](https://www.law.cornell.edu/regulations/texas/37-Tex-Admin-Code-SS-12-7)
- [HB 46 (89th Legislature), Senate bill analysis](https://capitol.texas.gov/tlodocs/89R/analysis/html/HB00046S.htm)
- [Texas DPS: Summary of new laws impacting the Compassionate Use Program](https://www.dps.texas.gov/section/compassionate-use-program/89th-legislation)
- [Vicente LLP: TCUP overview (Jan. 2026)](https://vicentellp.com/insights/texas-compassionate-use-program-tcup-overview/)

---

Created by **Nick Lax** · nlaxatx@gmail.com · MIT License
