# Everyday workflow: Claude Code and Copilot in VS Code

This is the quickest way to work on the TCUP COA Checker: Claude Code edits the files in your repository directly, runs the tests, and commits when you ask. Nothing needs downloading or copying. Copilot handles autocomplete while you type.

| Tool | Use it for |
|---|---|
| **Claude Code** (VS Code panel) | Features, fixes, parser and rule changes, tests, commits |
| **Claude app** (claude.ai or the desktop app) | Research, reading regulations, planning, writing |
| **Copilot** | Autocomplete as you type, and quick "explain this" questions |

## One-time setup

**1. Check the tools.** In PowerShell:

```powershell
code --version      # VS Code 1.94 or newer
git --version       # Git for Windows
node --version      # v18 or newer
```

If Git is missing, install [Git for Windows](https://git-scm.com/download/win) with the default options. Claude Code works better with it.

*Check:* all three print a version.

**2. Clone the repositories** next to each other, outside OneDrive (OneDrive syncing and Git don't mix well). Skip any you've already cloned:

```powershell
mkdir C:\Projects -Force; cd C:\Projects
git clone https://github.com/scenebiscuit-cell/coa-crosscheck.git
git clone https://github.com/scenebiscuit-cell/tcup-coa-checker.git
```

*Check:* `C:\Projects\tcup-coa-checker` exists and `git -C C:\Projects\tcup-coa-checker status` says "On branch main".

**3. Let PowerShell run npm** (once per computer). This affects only your user account:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Answer **Y**.

**4. Install the Claude Code extension.** In VS Code, press **Ctrl+Shift+X**, search **Claude Code**, choose the one published by **Anthropic**, and click **Install**.

*Check:* a spark icon appears in the left-hand bar.

**5. Open the repository and sign in.** Go to **File → Open Folder** and choose `C:\Projects\tcup-coa-checker`. Click the spark icon, click **Sign in**, and finish in the browser with your Claude account. Claude Pro is enough; you don't need an API key.

*Check:* type `What are this project's hard rules?` in the Claude Code panel. The answer should mention no build step, an official source for every rule change, and fictional COAs only. That means it read `CLAUDE.md`.

**6. Leave the permission mode on Manual for now.** The mode shows at the bottom of the prompt box. In Manual mode, Claude Code shows each file edit as a side-by-side comparison, and you accept or reject it. It also asks before running commands. The repository pre-approves a few harmless ones in `.claude/settings.json` (`npm test`, `git status`, `git diff`, `git log`), so those run without asking.

## The loop, for each change

**1. Start from the latest version.** In the **Source Control** panel (the branch icon on the left), click **Sync Changes**, or run `git pull` in the terminal.

**2. Ask for one change at a time**, in plain words, with how you'll judge it. For example:

> Lab "Ozark Labs" prints "Δ9 THC (mg/g)" in the header and the parser misses it. Here's the text: … Fix it so the potency rows read in mg/g.

> Add a glossary tooltip for "water activity" that explains it in one sentence a dispensary manager would understand.

For the two common jobs, use the shortcuts:

- `/add-lab-layout`, then paste the COA text and describe what was misread
- `/update-rule`, then the state, the value, and the official link

**3. Review the edits.** Claude Code shows each change. Accept what makes sense; reject anything that touches files you didn't expect, and say why. It runs `npm test` after changes. *Check:* the output ends with `# fail 0`.

**4. Look at the page.** In the VS Code terminal, run `npx --yes serve .` and open the address it prints (usually http://localhost:3000). Try the change the way a user would. Press **Ctrl+C** in the terminal to stop the server.

**5. Commit and push.** Ask Claude Code to "commit this", or use the **Source Control** panel: type a short message ("Read potency headers with units"), click **Commit**, then **Sync Changes**.

*Check:* on GitHub, the commit shows a green check from the Tests workflow, and the live site updates within a couple of minutes.

**6. Start fresh for the next task.** Type `/clear` in Claude Code between unrelated tasks. It keeps answers focused and uses less of your plan.

## Using your plans well

- Claude Code and the Claude app share the same Claude Pro limits (a 5-hour window plus a weekly cap). Batch small fixes into one request, use `/clear` between tasks, and do research in the Claude app before asking for code.
- Copilot autocomplete doesn't use Copilot's monthly credits, so let it handle typing. Copilot Chat and agent requests do use credits.
- When research turns up a rule change, bring the official link to `/update-rule`. Don't paste a number from memory.

## When something goes wrong

| Problem | Fix |
|---|---|
| Undo changes you haven't committed | **Source Control** panel → right-click the file → **Discard Changes**, or ask Claude Code "discard my uncommitted changes" |
| Undo a commit you haven't pushed | Ask Claude Code: "undo my last commit but keep the changes" |
| Tests fail | Paste the failure into Claude Code and ask it to fix the code, not the test |
| `npm` is blocked | Run step 3 of the setup, or use `npm.cmd test` |
| Claude Code ignores the project rules | Make sure VS Code has the repository folder itself open, not `C:\Projects` |
