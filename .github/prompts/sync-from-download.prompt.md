---
description: Copy an updated version of this project from a downloaded folder, test it, and push it
agent: agent
argument-hint: Path to the extracted folder, for example C:\Users\you\Downloads\tcup-coa-checker
---

Replace this repository's files with a newer copy that I downloaded, then test, commit, and push.

Folder with the new files: ${input:folder:Path to the extracted download}

1. Confirm the folder exists and contains `index.html`, `src/core.js`, and `package.json`. If it doesn't, stop and tell me what you found.
2. Copy everything from that folder over this repository, replacing existing files. Don't copy a `.git` folder, and don't delete files that exist only in the repository.
3. Run `git status` and list the changed and new files. If more than 25 files changed, or anything outside `src/`, `tests/`, `docs/`, `.github/`, `.claude/`, `CLAUDE.md`, `.gitignore`, `index.html`, `README.md`, `package.json`, or `LICENSE` changed, stop and ask me before going on.
4. Run `npm test`. If any test fails, stop and show me the failure. Don't commit.
5. Suggest a commit message from the changes and wait for my OK. Then commit and push to `main`.
6. Remind me that GitHub Pages takes a minute or two to update the live site.
