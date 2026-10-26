# Working on this project with GitHub Copilot

> **Recommended:** for day-to-day work, use Claude Code in VS Code instead of downloading and syncing zips. See [WORKFLOW.md](WORKFLOW.md). This guide covers Copilot.

This guide is for continuing development in VS Code with GitHub Copilot. Copilot reads the project rules automatically from `.github/copilot-instructions.md`, so you don't have to explain the project every time.

## What Copilot gets from this repository

| File | What it does | How you use it |
|---|---|---|
| `.github/copilot-instructions.md` | The project's rules, file map, and parser guide. Copilot Chat adds it to every request in this folder. | Nothing to do. Keep it up to date when the project changes. |
| `.github/prompts/add-lab-layout.prompt.md` | A step-by-step task: teach the parser a new lab's COA layout, test first. | Type `/add-lab-layout` in Copilot Chat and paste the COA text. |
| `.github/prompts/update-rule.prompt.md` | A step-by-step task: change a Texas limit or citation with a source and a test. | Type `/update-rule` and give the value and official link. |
| `.github/prompts/sync-from-download.prompt.md` | Copies a newer version you downloaded (for example from Claude) into the repo, tests, and pushes. | Type `/sync-from-download` and give the folder path. |
| `.github/workflows/test.yml` | Runs `npm test` on GitHub after every push. | Check the green or red mark next to each commit on GitHub. |

## One-time setup

**1. Install the tools.** You need [VS Code](https://code.visualstudio.com), [Git](https://git-scm.com/download/win), and [Node.js](https://nodejs.org) (LTS). In VS Code, sign in to GitHub with the account icon at the bottom left. That turns on Copilot.

*Check:* in PowerShell, `node --version` prints v18 or newer, and `git --version` prints a version.

**2. Clone the repositories.** In PowerShell:

```powershell
mkdir $HOME\Projects -Force
cd $HOME\Projects
git clone https://github.com/scenebiscuit-cell/coa-crosscheck.git
git clone https://github.com/scenebiscuit-cell/tcup-coa-checker.git
```

Clone both, because they share the parser.

**3. Open one repository per VS Code window.** Go to **File → Open Folder** and choose `Projects\tcup-coa-checker` (the repository folder itself, not `Projects`). Trust the folder when asked. Copilot reads the instructions and slash commands only from the `.github` folder of the folder you open. For the other repository, use **File → New Window** and open it there.

*Check:* the Explorer panel's top line shows `TCUP-COA-CHECKER`, and typing `/` in Copilot Chat lists `add-lab-layout`, `update-rule`, and `sync-from-download`.

**4. Run the tests once.** Open a terminal in VS Code (**Terminal → New Terminal**) and run:

```powershell
npm test
```

*Check:* the output ends with `# fail 0`.

## Everyday use

Open Copilot Chat (**Ctrl+Alt+I**), set the mode dropdown to **Agent**, and either type one of the slash commands above or describe the task in plain words. Copilot shows each command and file edit before running it; read them and click **Allow** or **Keep**.

Good tasks to hand Copilot:

- "This COA reads the batch number wrong" → `/add-lab-layout`
- "DPS adopted new testing rules" → `/update-rule`
- "Explain what `cellsOf` does, line by line"

Tasks to keep for yourself:

- Deciding what a rule *means* when it's ambiguous. Copilot can collect the text, but the compliance call is yours.
- Checking a real COA against the PDF by eye: compare every row of **Lab results as read** to the PDF and recompute one THC number by hand.

## When a real COA is misread

1. Load the PDF on the live site and note what's wrong in **Lab results as read**.
2. Copy the text from the COA box on the page (that's exactly what the parser sees).
3. In Copilot Chat, type `/add-lab-layout`, paste the text, and describe the problem.
4. Copilot writes a fictional copy of the layout, a failing test, and the fix. Real COAs never go into the repository.
5. When all tests pass, commit and push (step 4 of the next section).

If a COA is a scan or photo, the built-in parser can't read it at all. That's what the local AI model option is for.

## Saving your work to GitHub

In the VS Code terminal, from inside the repo folder:

```powershell
npm test
git status
git add -A
git commit -m "Read potency tables with LOQ columns"
git push
```

Or use the **Source Control** panel (the branch icon on the left): type a message, click **Commit**, then **Sync Changes**.

*Check:* on GitHub, the commit shows a green check from the Tests workflow, and the live site updates within a couple of minutes.

## How the parser is organized

See "How the parser works" in `.github/copilot-instructions.md`. The short version: `parseText` in `src/core.js` tries a list of patterns that recur across labs. Each pattern is a named constant you can extend:

| To support… | Change |
|---|---|
| A new field label ("Lot Code:", "Seed-to-Sale #") | `LABEL_NAMES` and the matching `field(...)` call |
| A new section name ("Elemental Impurities") | `SECTION_NAME` and `CATEGORY_WORDS` |
| A new table header word ("Analyte Name", "Amount") | `HEADER_FIRST` or `RESULTISH` |
| A new result word ("Not Detected in 10 g") | `VALUE_TOKEN` |
| A new cannabinoid name | `CANNABINOIDS` (acids before neutral forms) |

The same parser block lives in both repositories. After changing it in one, copy it to the other and run both test suites.
