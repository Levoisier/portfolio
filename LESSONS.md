# LESSONS.md — Engineering Log

**APPEND-ONLY.** Never edit or delete existing entries.  
When you hit a gotcha, a failed approach, or a non-obvious fix — add an entry.

**Template:**

```
### [YYYY-MM-DD] <short title>
**Context:** What were you trying to do?
**Problem/Dead-end:** What went wrong or why the first approach failed?
**Fix/Decision:** What actually worked, and why?
**Don't repeat:** One-line rule to prevent recurrence.
```

---

### [2026-06-20] Scaffold: pnpm approve-builds is interactive — use pnpm-workspace.yaml instead

**Context:** Setting up the project, running `pnpm install` for the first time with Astro 5.

**Problem/Dead-end:** `pnpm approve-builds` is interactive (requires TTY) and cannot be piped non-interactively. Running it in a non-TTY CI-like environment caused `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.

**Fix/Decision:** Added `pnpm-workspace.yaml` with `onlyBuiltDependencies: [esbuild, sharp]`. This grants build-script permission declaratively without needing the interactive command. Re-ran `CI=true pnpm install` to force the install without TTY checks.

**Don't repeat:** Always use `pnpm-workspace.yaml` `onlyBuiltDependencies` for native build approvals; never rely on the interactive `approve-builds` command in agent contexts.

---

### [2026-06-20] Scaffold: create astro CLI requires interactive TTY

**Context:** Tried to scaffold Astro using `pnpm create astro@latest . --template minimal --no-install --no-git --typescript strict`.

**Problem/Dead-end:** The CLI animation runs but requires an interactive terminal to progress past the loading state. No files were created in the non-TTY agent environment.

**Fix/Decision:** Created `package.json`, `astro.config.mjs`, `tsconfig.json`, and all source files manually. This gives full control over file contents and is reproducible.

**Don't repeat:** In agent contexts, never use interactive CLI scaffolders (`create astro`, `create next-app`, etc.). Write configs directly.
