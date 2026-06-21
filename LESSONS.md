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

---

### [2026-06-20] DM Mono upstream does not provide a variable WOFF2

**Context:** Implementing the self-hosted variable fonts backlog item.

**Problem/Dead-end:** The documented `DMMono-VariableFont_wght.woff2` file is not present in Google Fonts' `ofl/dmmono` upstream directory; the family currently ships static TTF faces. A transient `ttf2woff2` conversion also failed to parse the signed upstream TTF, and `fonteditor-cli` does not exist on npm.

**Fix/Decision:** Kept the documented public path for the site contract, declared the face as its real `truetype` format, and recorded the mismatch in DECISIONS.md so a future true variable WOFF2 can replace it without changing component code.

**Don't repeat:** Check upstream font manifests before assuming a variable font artifact exists just because the local filename says variable.

---

### [2026-06-20] Prettier must ignore read-only agent skill manuals

**Context:** Running `pnpm verify` before committing the self-hosted fonts item.

**Problem/Dead-end:** `pnpm format:check` scanned `.agents/skills/gsap-*` markdown files and failed formatting, but those files are mounted read-only in this workspace and cannot be rewritten even after `chmod u+w`.

**Fix/Decision:** Added `.agents/` to `.prettierignore` because skill manuals are external agent resources, not project source files.

**Don't repeat:** Keep read-only tool/skill mounts out of repo-wide format checks.

---

### [2026-06-20] Reduced-motion scenes must reveal during init

**Context:** Polishing the hero entrance choreography.

**Problem/Dead-end:** The scroll controller skips ScrollTrigger setup when `prefers-reduced-motion: reduce` is active, so scene `enter()` callbacks do not run. The hero scene had split characters hidden in `init()` and only revealed them in `enter()`.

**Fix/Decision:** Set the reduced-motion visible state directly in `hero.init()`, with opacity at 1 and motion transforms at rest.

**Don't repeat:** Any scene that hides elements in `init()` must also fully reveal them in the reduced-motion branch of `init()`.

---

### [2026-06-20] Narrow optional scene config fields before mapping

**Context:** Building the global backdrop scene from a readonly layer config array.

**Problem/Dead-end:** TypeScript rejected `config.drift` because only one member of the readonly config union defines that optional field.

**Fix/Decision:** Narrowed with `'drift' in config` before creating the runtime layer object.

**Don't repeat:** With `noUncheckedIndexedAccess` and strict unions, narrow optional config fields before reading them from `as const` arrays.
