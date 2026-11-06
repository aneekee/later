# #141 chore-init-sdlc: analysis and plan

- **Input:** `0__init.md` in this folder.
- **Research:** done on 2026-10-25, on branch `141-chore-init-sdlc` at `554cbe6`. Covered:
  - the repo: `CLAUDE.md`, `.claude/`, `.agents/`, `brainstorm/`, CI, and the api/web layout;
  - the OpenSpec docs (openspec.dev and the GitHub `docs/` folder);
  - the `@fission-ai/openspec@1.15.0` package source (schema, templates, skills, validator), unpacked in a scratch folder.

  Nothing was installed into the repo or run against it.

- **Status (2026-11-05):**
  - Done: T1, T2, T3 (`CONTEXT.md`), and the `CLAUDE.md` and runbook parts of T5 (the runbook is now `docs/sdd-workflow.md`).
  - D2 was revised: specs grow change by change, so T8 (baseline specs) is dropped.
  - Deferred until needed: T4 (ADRs), T6 (`.claude/settings.json`), T7 (CI step, PR template, script) and the rest of T5 (READMEs, `brainstorm/template.md`, the per-app `CLAUDE.md` split).
- **IDs:** D = decision, T = task, R = risk.

## TL;DR

- **OpenSpec 1.15.0** (latest on npm, released 2026-10-24) needs Node >= 20.19.0. The repo's `engines` already require that.
- **`openspec init --tools claude` touches very little.** It adds:
  - `openspec/` (`config.yaml`, `specs/`, `changes/`);
  - `.claude/skills/openspec-*/` and `.claude/commands/opsx/*.md`.

  It doesn't touch `CLAUDE.md`, the existing skills or any code.

- **The CLI must be on `PATH`.** The installed skills call it directly (`openspec status --change … --json`, `openspec instructions <artifact> --change … --json`, `openspec new change`). So install it globally; a devDependency alone isn't enough. CI runs a pinned `pnpm dlx`.
- **Your brainstorm flow maps almost 1:1** (§2):

  | Brainstorm today       | OpenSpec                                         |
  | ---------------------- | ------------------------------------------------ |
  | `0__init.md`           | `ask.md`                                         |
  | grill-me session       | `/opsx:explore` + the `grilling` skill           |
  | requirements           | `proposal.md` + delta specs                      |
  | analysis and decisions | `design.md`                                      |
  | implementation plan    | `tasks.md`                                       |
  | "done"                 | `/opsx:archive`, which updates `openspec/specs/` |

- **What OpenSpec gives you that brainstorm doesn't:**
  - a **living description of current behavior** (`openspec/specs/`);
  - **trackable tasks** (checkboxes, so apply resumes where it stopped);
  - **validation** (`openspec validate --strict`);
  - one loop that every agent session follows.
- **What the repo still lacks, and OpenSpec doesn't provide:**
  - a domain glossary (`CONTEXT.md`);
  - long-lived decisions (`docs/adr/`);
  - project permissions and hooks (`.claude/settings.json`);
  - a PR template;
  - spec validation in CI;
  - a real `README.md` (today it's the Turborepo starter text, which misleads agents).
- **Recommended shape** (§6):
  - freeze `brainstorm/`;
  - change name = branch name;
  - archive inside the PR;
  - the built-in `spec-driven` schema, customized only through `config.yaml`;
  - no baseline specs: they grow change by change, as OpenSpec advises (D2, revised on 2026-11-05).

---

## 1. Current state (facts)

### 1.1 Repo and AI setup

| Area             | State                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`      | ~5.9 KB: commands, the API and web architecture, and workflow conventions. Up to date after #157. Its workflow section points agents at `brainstorm/`.                                                                                   |
| `.claude/`       | `launch.json` (web on 5175, api on 3000) and `skills/`. Three symlinks: `domain-modeling`, `grill-me` and `grilling` → `.agents/skills/*`. No `settings.json`, hooks, commands or agents.                                                |
| `.agents/skills` | Installed from `mattpocock/skills` and pinned in `skills-lock.json`. `domain-modeling` expects a root `CONTEXT.md` and `docs/adr/`, but neither exists. Each skill also ships an `agents/openai.yaml` (Codex metadata).                  |
| `brainstorm/`    | 16 folders, `<YYYYMMDDNN>__<branch>/`. Details in §1.2.                                                                                                                                                                                  |
| Docs             | `README.md` is the unchanged Turborepo starter (it mentions Next.js, a `docs` app and `@later/ui`, none of which exist). There's no `docs/` folder, no `CONTEXT.md` and no ADRs.                                                         |
| Tests            | Jest specs exist only for auth, users, prisma and the app controller, plus one e2e file. The web app has no tests. CI doesn't run tests.                                                                                                 |
| CI               | `.github/workflows/ci.yaml` runs `prisma generate`, `turbo build` and `turbo lint`. There's no PR template.                                                                                                                              |
| Product          | After #157 the product is small. API routes: `v1/auth` (me, login, register, refresh, logout), `v1/notes` (create, rate, delete), `v1/feed` (GET next page) and `v1/stats/notes/totals`. Web routes: `/feed`, `/dashboard` and `/login`. |
| Tooling          | `gh` isn't installed locally, so agents can't read issues or open PRs from the shell.                                                                                                                                                    |
| Secrets          | `apps/api/.env.production.local` sits in the working tree. It's gitignored, but an agent can still read it.                                                                                                                              |

### 1.2 The brainstorm workflow today

- **A typical folder** (#145, #146, #150) has two files:
  - `0__init.md`: the raw ask;
  - after a grill-me session, `1__requirements-and-plan.md`, with "Requirements (agreed)", a file-by-file "Implementation plan" and a "Verify" checklist.
- **A large folder** (#157) splits this up:
  - `1__analysis.md`: facts, with IDs G/R/C/Q;
  - `2__requirements.md`: the agreed answers;
  - `3__implementation-plan.md`: tasks T1..T10, a dependency graph, a "parallel-safe" table, rules for agents and an ops runbook.
- `brainstorm/template.md` (frontmatter + Overview/To Do) isn't used by any recent folder.
- **What's missing**, as far as I can tell from the folders:
  - **No description of the system as it is now.** Each folder is a delta against a "now" that lives only in the code. Every folder before #157 describes chats, the inbox and resolutions, none of which exist anymore. Nothing says which statements are still true.
  - **Plans aren't machine-checkable.** Progress isn't tracked, so a resumed session has to work out what's done. The format drifts from folder to folder, and nothing validates it.
  - **Decisions don't outlive their folder.** For example, "the feed GET isn't idempotent" and "renames are hand-written migrations" survive only because they were copied into `CLAUDE.md` by hand.

### 1.3 OpenSpec 1.15.0, the parts that matter here

- **Install:** `npm i -g @fission-ai/openspec@1.15.0` or `brew install openspec`. Node >= 20.19.0. MIT license.
- **What `openspec init --tools claude` writes** (it says nothing else in the repo changes):
  - `openspec/config.yaml` (`schema: spec-driven`, plus commented examples);
  - `openspec/specs/` (empty);
  - `openspec/changes/` and `openspec/changes/archive/` (empty);
  - `.claude/skills/openspec-<workflow>/SKILL.md`;
  - `.claude/commands/opsx/<workflow>.md`, invoked as `/opsx:<workflow>`.
- **Workflows (profiles):**
  - **core** (the default): `explore`, `propose`, `apply`, `update`, `sync`, `archive`;
  - **optional:** `new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`.
  - The profile and the delivery mode (`skills`, `commands`, or `both`, the default) are **global per machine** (`openspec config profile`). `openspec update` then applies them to each project.
- **`openspec update` regenerates the skill and command files.** It warns before it overwrites a hand edit, but the edit is still lost. **Don't edit generated files.** Customize through `config.yaml` instead, or fork a schema.
- **Artifacts** (built-in `spec-driven` schema): `proposal` → `specs` and `design` (each needs `proposal`) → `tasks` (needs `specs` + `design`). `apply` tracks the `tasks.md` checkboxes.
  - **`proposal.md`:**
    - `## Why` must be 50..1000 chars, and `## What Changes` is required;
    - `## Capabilities` lists the new and modified capabilities;
    - `## Impact`.
  - **Delta specs** (`specs/<capability>/spec.md`):
    - `## ADDED | MODIFIED | REMOVED | RENAMED Requirements`;
    - `### Requirement: <name>` with SHALL/MUST, at most 500 chars of description (enforced by `--strict`);
    - `#### Scenario: <name>` (exactly 4 `#`), with `- **WHEN**` / `- **THEN**`;
    - every requirement needs at least one scenario;
    - MODIFIED must contain the **whole** requirement, and its header must match the old one exactly;
    - REMOVED needs **Reason** and **Migration**;
    - a new capability starts with `## Purpose` (50+ chars).
  - **`design.md`:** Context, Goals / Non-Goals, Decisions (with alternatives), Risks / Trade-offs, Migration Plan and Open Questions. Write it only when the change needs it.
  - **`tasks.md`:**
    - `## N. Group` headings with `- [ ] N.M task` lines;
    - each task says how it's verified;
    - each group lands its own tests and docs, not a final catch-all group;
    - lines without a checkbox aren't tracked, so a dependency table can sit at the top.
- **A change** needs at least one delta, or `skip_specs: true` in its `.openspec.yaml` (for tooling, docs or a pure refactor).
- **Extra files in a change folder** (e.g. `ask.md`) are ignored by `validate`, and archive moves them along with the folder.
- **Change names** must match `^[a-z0-9]+(-[a-z0-9]+)*$`, up to 200 chars. So `141-chore-init-sdlc` is valid, as long as the slug has no uppercase letters and no `--`. Archive moves a change to `openspec/changes/archive/YYYY-MM-DD-<name>/`.
- **Validation:**
  - `openspec validate --all --strict --no-interactive` checks every active change and spec, and exits 1 on failure;
  - with nothing to validate, it prints "No items found" and exits 0;
  - `--archived` is a separate scope.
- **`config.yaml` keys:**
  - `context`: up to 50 KB, injected into every artifact, apply and archive;
  - `rules`: per artifact id, added to the built-in instructions (they never replace them);
  - `operations.apply|archive.guidance`;
  - invalid fields are dropped with a warning and never fail a command.
- **Telemetry:** anonymous (the command name and version only), and off in CI. To opt out, run `openspec config set telemetry.enabled false`, or set `OPENSPEC_TELEMETRY=0` / `DO_NOT_TRACK=1`.
- **Brownfield advice** (`docs/existing-projects.md`):
  - write specs only for what you're about to change, and let them grow one change at a time;
  - don't bulk-convert old docs: keep them as background;
  - fill in `context:`;
  - keep the first changes small.

---

## 2. Mapping the brainstorm workflow onto OpenSpec

| Brainstorm today                                         | OpenSpec                                                                                                                        | Notes                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `brainstorm/<YYYYMMDDNN>__<branch>/`                     | `openspec/changes/<branch>/` → `openspec/changes/archive/YYYY-MM-DD-<branch>/`                                                  | The archive date prefix replaces the `YYYYMMDDNN` prefix.                                                                   |
| `0__init.md` (raw ask)                                   | `ask.md` in the change folder (not an OpenSpec artifact)                                                                        | The raw ask doesn't fit in `## Why` (1000-char max). A `config.yaml` rule makes the proposal account for every point in it. |
| grill-me session                                         | `/opsx:explore` + `grilling`                                                                                                    | Explore reads the code and specs and writes nothing. Grilling drives the decisions. Keep both.                              |
| `1__analysis.md` (facts, G/R/C/Q)                        | `design.md` → Context and Risks; a long research dump can go in an optional `analysis.md` next to `ask.md`                      | Only what's needed for the approach goes into `design.md`.                                                                  |
| "Requirements (agreed)", scope and out of scope          | `proposal.md` (Why, What Changes + "Out of scope", Capabilities, Impact)                                                        | The "Out of scope" list comes from a rule (§4.1).                                                                           |
| Agreed behavior (limits, status codes, UI behavior)      | **delta specs**: `specs/<capability>/spec.md` with WHEN/THEN scenarios                                                          | This is the new part: on archive, behavior lands in `openspec/specs/` and stays current.                                    |
| Agreed technical decisions (data model, migrations, Q→A) | `design.md` → Decisions (with alternatives), Migration Plan                                                                     | A rule says "every grilled decision becomes a Decision". Hard-to-reverse ones are promoted to `docs/adr/` on archive.       |
| Implementation plan (file-by-file, T1..Tn, dep graph)    | `tasks.md`: `## N. Group` = one commit; tasks name files and their verification; the dependency table sits as plain text on top | `/opsx:apply` checks tasks off and resumes from the first unchecked one.                                                    |
| "Verify" checklist                                       | the verification text in each task, plus `/opsx:verify`                                                                         | Verify reports CRITICAL, WARNING and SUGGESTION findings. It doesn't block.                                                 |
| ops runbook (e.g. #157 prod steps)                       | `design.md` → Migration Plan; the owner-only steps go under `## Workflow follow-up` (untracked bullets) in `tasks.md`           | Untracked bullets don't block apply or archive.                                                                             |
| PR merged, folder kept forever                           | `/opsx:archive` as the last commit in the PR                                                                                    | Archive merges the deltas into `openspec/specs/` and moves the folder.                                                      |
| `CLAUDE.md`: "read the matching brainstorm folder"       | the OpenSpec skills find the change through the CLI; `CLAUDE.md` describes the loop                                             |                                                                                                                             |

---

## 3. Target workflow (one feature, end to end)

This is the short version. The full runbook (the review-gate checklists, the variants, a worked example and a cheat sheet) is [`docs/sdd-workflow.md`](../../docs/sdd-workflow.md).

```sh
git switch -c 170-feature-edit-notes             # <issue#>-<type>-<slug>, as today
openspec new change 170-feature-edit-notes       # creates the folder + .openspec.yaml
```

1. **Capture the ask.** Paste the raw ask into `openspec/changes/170-feature-edit-notes/ask.md`, or ask Claude to save it there verbatim.
2. **Explore and grill** (session 1): `/opsx:explore 170-feature-edit-notes`, then "grill me". Claude reads `CONTEXT.md`, the related `openspec/specs/*` and the code, and you settle the decisions.
3. **Propose** (same session): `/opsx:propose 170-feature-edit-notes`, and answer "continue" when it says the change exists. It writes `proposal.md`, `specs/notes/spec.md` (delta), `design.md` (if needed) and `tasks.md`.
4. **Review**, in this order: proposal → delta specs → tasks. Edit by hand or with `/opsx:update`. Then run `openspec validate 170-feature-edit-notes --strict` and commit: `170: plan`.
5. **Apply** (session 2, fresh context, as OpenSpec recommends): `/opsx:apply 170-feature-edit-notes`. One commit per task group. If it's interrupted, run it again: it resumes at the first unchecked task.
6. **Verify**: `/opsx:verify 170-feature-edit-notes`, then fix anything CRITICAL.
7. **Archive** (the last commit of the PR): `/opsx:archive 170-feature-edit-notes`. The deltas go into `openspec/specs/notes/spec.md`, and the folder moves to `archive/2026-11-02-170-feature-edit-notes/`. Promote ADR-worthy decisions and add new glossary terms.
8. **PR** (from the template, with the delta spec linked first), then squash-merge as today.

For a big change like #157, use `/opsx:continue` (optional profile) in place of `propose`. It writes one artifact at a time, so you can grill and review each one before the next. Leave Claude Code's plan mode out of this loop: the change folder is the plan.

---

## 4. What to add

```
later/
├── openspec/
│   ├── config.yaml                       # T1 (init) + T2 (content, §4.1)
│   ├── specs/{auth,notes,feed,dashboard}/spec.md   # T8, via the first change's archive
│   └── changes/
│       └── archive/2026-10-2x-141-chore-init-sdlc/ # T8, the first change, archived
├── .claude/
│   ├── settings.json                     # T6 (§4.5)
│   ├── skills/openspec-*/SKILL.md        # T1, generated, don't edit
│   ├── commands/opsx/*.md                # T1, generated, don't edit
│   └── skills/{grilling,grill-me,domain-modeling}   # existing symlinks, unchanged
├── CONTEXT.md                            # T3 (§4.2)
├── docs/adr/0001-….md … 0005-….md        # T4 (§4.3)
├── docs/sdd-workflow.md                  # T5, moved from 2__sdd-feature-workflow.md
├── CLAUDE.md                             # T5 (§4.4)
├── apps/api/CLAUDE.md, apps/web/CLAUDE.md   # T5, optional split (D9)
├── README.md                             # T5, rewritten
├── brainstorm/README.md                  # T5, "frozen" notice; template.md deleted
├── .github/pull_request_template.md      # T7 (§4.6)
├── .github/workflows/ci.yaml             # T7, validate step
├── package.json                          # T7, "spec:validate" script
└── .gitignore                            # T6, + .claude/settings.local.json
```

### 4.1 `openspec/config.yaml` (written in T2, checked against the code on 2026-10-26)

OpenSpec's own guidance for `context`: list only the constraints an agent can't infer from the code. Claude Code already loads `CLAUDE.md`, so `context` points to it rather than repeating it.

```yaml
schema: spec-driven

context: |
  Later is a feed-like notes app: a user creates, rates and deletes notes, works through the stalest ones in a feed, and sees totals on a dashboard.
  CLAUDE.md is the source of truth for commands, architecture and conventions. CONTEXT.md is the domain glossary: use its terms. Never call a note a message, and never bring back chat, inbox or resolution (the `message` field of API responses is unrelated).
  A change is named after its git branch: <issue#>-<type>-<slug>, where type is feature, chore, refactor or bug.
  A change folder may hold ask.md (the owner's raw ask, verbatim) and analysis.md (research notes). They are inputs, not artifacts. Never rewrite ask.md.
  Specs describe what a user or the web client can observe: routes, status codes, error messages, limits, ordering, UI behavior. One spec covers both the API and the web side of a capability.
  Verification today: `pnpm --filter api exec prisma generate`, `pnpm build`, `pnpm lint`, plus a manual check in the browser or with curl. Jest tests exist but don't run in CI.
  Only the owner touches production. Prod migrations (`db:migrate:prod`, nothing runs them on deploy) and the one-off scripts in apps/api/sql/backfills/ are run by hand, in a set order around the merge.

rules:
  proposal:
    - End What Changes with an "Out of scope" list, even a short one. When ask.md exists, every point in it is either covered in What Changes or listed under Out of scope.
    - Reference the GitHub issue number from the change name in Why.
    - Reuse an existing capability (auth, notes, feed, dashboard) before adding a new one. The dashboard capability owns the v1/stats routes.
    - In Impact, name each part the change touches (apps/api, apps/web, @later/types, prisma/schema.prisma).
  specs:
    - Put limits (max lengths, ranges, page sizes), error status codes and error messages into scenarios, with the exact values.
    - When a behavior spans the API and the web app, give each side its own scenario (e.g. the API rejects it, the UI disables it).
  design:
    - Record every decision agreed while grilling as a Decision, with the alternatives that were rejected.
    - When prisma/schema.prisma changes, add a "Data model and migrations" section. A renamed model or column needs a --create-only migration with hand-written ALTER ... RENAME statements. Name any backfill script and the order of the steps on prod.
    - When a table or column changes, list every raw SQL query (Prisma.sql, $queryRaw) that names it; tsc doesn't check them.
    - List the @later/types changes, if any.
  tasks:
    - Make each task group one commit that leaves the build green.
    - Name the files each task touches.
    - End each group with the gate (prisma generate, pnpm build, pnpm lint). Add a browser or curl check when behavior changes.
    - Cover every scenario in the delta specs with at least one task.
    - Put owner-only steps (a prod migration, a backfill on prod) under `## Workflow follow-up` as plain bullets, in the order they must run.
    - If groups can run in parallel, say which ones, and note that they need separate git worktrees.
    - A group that changes a convention or a command updates CLAUDE.md in the same group.

operations:
  apply:
    guidance:
      - Before the first task, read CLAUDE.md, CONTEXT.md and the change's proposal, specs and design.
      - Commit after each task group. Never push.
      - If a task turns out to be wrong, make the minimal fix and note it under the task. Stop and ask if the fix would change a spec.
  archive:
    guidance:
      - Run `openspec validate <change> --strict` first.
      - Promote each design.md Decision that is hard to reverse, surprising, and the result of a real trade-off to docs/adr/ (domain-modeling format).
      - Add any new domain term to CONTEXT.md.
```

### 4.2 `CONTEXT.md` (draft, glossary only)

Written in the `domain-modeling` skill's format. It's the place to stop "message" and "chat" from creeping back.

```md
# Later

A feed-like notes app: a user saves notes and works through the stalest ones in a feed.

## Language

**User**:
A person with an account who owns notes.
_Avoid_: account, member

**Note**:
A short text a user saves to come back to later. Text is the only kind today.
_Avoid_: message, item, post

**Feed**:
A user's endless queue of their own notes, served stalest first, one page at a time.
_Avoid_: inbox, timeline, chat

**Seen**:
A note is seen once the feed has served it. A new note is created already seen, so it joins the end of the rotation.
_Avoid_: read, viewed, resolved

**Rotation**:
The order in which the feed cycles through notes: never-seen notes first, then the ones unseen for the longest, adjusted by rating.

**Rating**:
A whole number from 0 to 10000 on a note. Each point brings the note back one hour sooner in the rotation.
_Avoid_: score, votes, likes

**Dashboard**:
The page with a user's note totals.
_Avoid_: home, stats page

## Retired terms (removed in #157)

Message, Chat, Inbox and Resolution no longer exist. Don't use them in code, specs or UI text.
```

### 4.3 `docs/adr/` (seeds)

These use the domain-modeling ADR format (a few sentences each). Each one passes the skill's 3-part test (hard to reverse, surprising, a real trade-off):

| ADR  | Decision                                                                                                                                  | Source           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0001 | Postgres holds the domain data.                                                                                                           | #40, `CLAUDE.md` |
| 0002 | Notes belong to a user directly. Chats, the inbox and resolutions were removed (the move from chat-like to feed-like notes).              | #145, #157       |
| 0003 | `GET v1/feed` isn't idempotent: serving a page marks it seen. The web app never refetches or invalidates the feed; it patches the cache.  | #122, #146, #150 |
| 0004 | Auth uses a JWT in cookies, behind a global guard that's on by default (`@Public()` opts out). The web app refreshes once behind a mutex. | #14, `CLAUDE.md` |
| 0005 | Spec-driven development with OpenSpec. `brainstorm/` is frozen (this change).                                                             | #141             |

The "hand-written rename migrations" rule stays in `CLAUDE.md`. It's a procedure, not a decision.

### 4.4 `CLAUDE.md` changes

Replace the "Workflow conventions" section with:

```md
## Workflow conventions

- Branches are named `<issue#>-<type>-<slug>` (e.g. `150-feature-add-deleting-notes-from-feed`), and PRs are squash-merged with that name.
- **Spec-driven development with OpenSpec** (`openspec/`, CLI `openspec` 1.15.x on PATH):
  - `openspec/specs/<capability>/spec.md` is the agreed current behavior (`auth`, `notes`, `feed`, `dashboard`). Read the relevant spec before you change behavior.
  - Each piece of work is one change, `openspec/changes/<branch-name>/`, holding `ask.md` (the raw ask), `proposal.md`, delta `specs/`, `design.md` and `tasks.md`.
  - The loop: `/opsx:explore` + grilling → `/opsx:propose <branch-name>` → review → `/opsx:apply` in a fresh session → `/opsx:verify` → `/opsx:archive`, as the PR's last commit. The step-by-step runbook is `docs/sdd-workflow.md`.
  - A change with no behavior change (tooling, docs, pure refactor) sets `skip_specs: true` in its `.openspec.yaml`.
  - Don't edit `.claude/skills/openspec-*` or `.claude/commands/opsx/`; `openspec update` regenerates them. Customize in `openspec/config.yaml`.
- `CONTEXT.md` is the domain glossary, and `docs/adr/` holds long-lived decisions. Maintain both with the `domain-modeling` skill.
- `brainstorm/` is the frozen pre-OpenSpec history. Read it for background, but don't add to it, and don't treat it as current behavior.
- Project skills (`domain-modeling`, `grilling`) live in `.claude/skills/`.
```

Optionally (D9), move "Architecture → API" into `apps/api/CLAUDE.md` and "Architecture → Web" into `apps/web/CLAUDE.md`. Claude Code loads a nested `CLAUDE.md` only when it works on files under that folder. That keeps the always-loaded root file short, and the app rules stay next to their code.

### 4.5 `.claude/settings.json` (draft, committed)

```json
{
  "permissions": {
    "allow": [
      "Bash(openspec list:*)",
      "Bash(openspec show:*)",
      "Bash(openspec status:*)",
      "Bash(openspec instructions:*)",
      "Bash(openspec validate:*)",
      "Bash(openspec schemas:*)",
      "Bash(pnpm build)",
      "Bash(pnpm lint)",
      "Bash(pnpm check-types)",
      "Bash(pnpm --filter api exec prisma generate)",
      "Bash(pnpm --filter api exec prisma validate)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Read(./apps/api/.env.production.local)",
      "Bash(git push --force:*)",
      "Bash(pnpm --filter api exec prisma migrate reset:*)"
    ]
  },
  "env": {
    "OPENSPEC_TELEMETRY": "0"
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.ts|*.tsx|*.md) cd \"$CLAUDE_PROJECT_DIR\" && pnpm exec prettier --write \"$f\" >/dev/null 2>&1 ;; esac; exit 0"
          }
        ]
      }
    ]
  }
}
```

- **Allow** covers the read-only OpenSpec calls the skills make all the time, plus the build/lint gate. `openspec archive` and `openspec new change` are left out on purpose: they write files, so they should prompt. Run `/fewer-permission-prompts` after a few sessions to extend the list from real usage.
- **Deny** protects the prod env file and the two destructive commands. Personal tweaks go in `.claude/settings.local.json` (gitignored in T6).
- **`env`** opts the agent's `openspec` calls out of telemetry (D11). Drop it if you don't mind the telemetry.
- **The hook** runs Prettier on every edited `.ts`, `.tsx` or `.md` file (matching the existing `format` script), so neither an agent's code nor the OpenSpec markdown drifts from the repo style. Create it with the `update-config` skill rather than by hand.
- **No `openspec validate` hook, on purpose.** During `propose` the artifacts are incomplete for several turns, so a validate hook would either be noise or (as a Stop hook with exit 2) keep Claude looping. Validation runs at review time (§3 step 4), at archive (the `operations` rule) and in CI.

### 4.6 CI and PR template

`.github/workflows/ci.yaml`, after "Lint":

```yaml
- name: Validate specs
  run: pnpm dlx @fission-ai/openspec@1.15.0 validate --all --strict --no-interactive
```

- `pnpm dlx` keeps the CLI out of the lockfile, so its transitive dependencies don't add to the long `pnpm.overrides` list. Telemetry is off in CI by default.
- Root `package.json` gets `"spec:validate": "openspec validate --all --strict --no-interactive"` for local runs (it uses the global CLI).

`.github/pull_request_template.md`:

```md
## Change

- Issue: #
- OpenSpec change: `openspec/changes/archive/<date>-<branch>/` (read `proposal.md`, then `specs/`, then the code)

## Delta specs

<!-- Paste or link the delta spec(s); skip_specs changes say why. -->

## Checklist

- [ ] Every task in `tasks.md` is checked
- [ ] `/opsx:verify` has no CRITICAL findings
- [ ] `openspec validate --all --strict` passes
- [ ] The change is archived (the specs in `openspec/specs/` are updated)
- [ ] `CLAUDE.md`, `CONTEXT.md` and `docs/adr/` are updated if the change affects them
```

### 4.7 `README.md` and `brainstorm/README.md`

- **`README.md`:** replace the starter text with a short human README: what Later is, the `pnpm` commands, links to `CLAUDE.md`, `CONTEXT.md` and `openspec/`. Keep it under a screen. `CLAUDE.md` stays the detailed source.
- **`brainstorm/README.md`:** "Frozen on 2026-10-25 (#141). Pre-OpenSpec design notes, kept for history. Folders before #157 describe chats, the inbox and resolutions, which no longer exist. New work goes to `openspec/changes/`." Delete `brainstorm/template.md`.

### 4.8 Baseline specs (the first change)

These are deliberately thin: only observable behavior, and a few requirements per capability. Every number in a scenario is read from the code during `propose`, not from this list. This list only marks the scope.

| Capability  | Candidate requirements                                                                                                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`      | Register; log in (sets the `access_token` and refresh cookies); current user (`GET me`); refresh; log out (clears the cookies); every route needs auth unless it's public. Web: unauthenticated users land on `/login`; a 401/403 triggers one refresh, then a retry.                                                                                    |
| `notes`     | Create a note (non-blank, up to 1000 chars, created as seen); set a rating (an integer from 0 to 10000); delete a note; only the owner can change a note (403 "You don't have access to this note" otherwise). Web: the note input (Enter sends, Shift+Enter adds a newline, blank text can't be sent, it grows up to a cap, the text stays on failure). |
| `feed`      | Serve the next page (default page size 10), which marks the served notes seen; the rotation order (never seen first, then seen least recently minus 1 h per rating point, then rating desc, then created asc); the total. Web: infinite scroll; never refetches the feed; rating and delete update the visible page in place.                            |
| `dashboard` | A user's total number of notes. Web: `/dashboard` shows it; `/` redirects to `/feed`.                                                                                                                                                                                                                                                                    |

- **Left out until a change touches them:** performance analytics (internal, not user-facing) and `health`.
- **The tasks for this change** check each scenario against the code (read the code, or hit the route with curl). **Fix the spec, not the code.** If the code looks wrong, open an issue; don't fix it in #141.

---

## 5. Other things worth considering (not in this PR)

- **Root `AGENTS.md`.** Only if you also use Codex, Cursor or another agent: the skills' `agents/openai.yaml` suggests Codex might be in use. Make `AGENTS.md` the canonical file and reduce `CLAUDE.md` to `@AGENTS.md` plus the Claude-only notes. Also add `codex` to `openspec init --tools`. Skip it otherwise; two files that drift apart are worse than one.
- **The `gh` CLI.** Install it locally so agents can run `gh issue view <n>` and save the issue body into `ask.md`, and open PRs that follow the template. Your branch names start with the issue number, so a small project skill (`.claude/skills/start-change/`) could later do the whole first step: branch, `openspec new change`, `ask.md` from the issue. This is a project-owned skill, so `openspec update` won't touch it.
- **Tests in CI and scenario coverage.** Scenarios are written as test cases. A follow-up issue could:
  - add `pnpm --filter api test` (and e2e) to CI;
  - add a `tasks` rule: "add a jest test for each new API scenario that's cheap to test".

  It's left out here because today's plans say "no new automated tests", and changing that is your call.

- **A custom schema** (`openspec schema fork spec-driven later`). Revisit it after 2-3 changes if the built-in artifacts don't fit, for example if you want a tracked `decisions.md` artifact for grilling. A fork is a snapshot, and `openspec update` won't bring upstream improvements into it.
- **A read-only reviewer subagent** (`.claude/agents/spec-reviewer.md`). It would review a change's artifacts against `CONTEXT.md`, the specs and the code before apply. Try `/opsx:update` and `/opsx:verify` first; add the subagent only if they miss things.
- **The grilling skill's format.** `grilling` asks a whole round of questions at once. If you prefer one clickable question at a time, say it in a project-owned note (e.g. in `CLAUDE.md`), not by editing the skill: `skills-lock.json` would overwrite the edit on the next skills update.

---

## 6. Decisions (recommended answers; confirm or grill)

| D   | Question                                 | Recommendation                                                                                                                      | Why                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | What happens to `brainstorm/`?           | **Freeze it**: a README notice, `template.md` deleted, nothing converted.                                                           | OpenSpec advises against bulk conversion. Most folders describe removed behavior. Keeping them in place keeps old links working.                                                                                                                        |
| D2  | Baseline specs now, or grow them lazily? | **Grow them lazily** (revised on 2026-11-05; the first answer was a thin baseline now, §4.8).                                       | OpenSpec's brownfield guide advises it, and specs for untouched code go stale. A capability's first change writes ADDED with a Purpose. A `config.yaml` context line says so, because `validate` accepts MODIFIED on a missing spec but archive aborts. |
| D3  | Change naming                            | **Change name = branch name** (`141-chore-init-sdlc`).                                                                              | It passes OpenSpec's id grammar, so the issue, branch, change, archive folder and PR are all traceable 1:1.                                                                                                                                             |
| D4  | When to archive                          | **Inside the PR**, as its last commit.                                                                                              | You work solo and squash-merge, so one squash commit carries the code, the spec update and the archive move. `main` never has a stale active change for shipped work.                                                                                   |
| D5  | Profile                                  | **core + `continue` + `verify`**, with delivery `both`.                                                                             | `continue` fits large, grill-heavy changes (one artifact at a time). `verify` replaces the hand-written Verify section. `onboard`, `ff`, `new` and `bulk-archive` aren't needed (`openspec new change` is available as a CLI command anyway).           |
| D6  | Schema                                   | **The built-in `spec-driven`**, customized only through `config.yaml`.                                                              | `rules` cover every convention from your plans. A fork would stop receiving upstream improvements.                                                                                                                                                      |
| D7  | How the CLI is installed                 | **Global** (`npm i -g @fission-ai/openspec@1.15.0` or brew), plus a **pinned `pnpm dlx` in CI**.                                    | The skills call `openspec` from PATH. Keeping it out of the root devDependencies keeps the lockfile and the overrides list smaller.                                                                                                                     |
| D8  | Where the raw ask lives                  | **`ask.md` in the change folder**, verbatim.                                                                                        | `## Why` is capped at 1000 chars. `validate` ignores extra files, archive keeps them, and the proposal rule traces every point in the ask.                                                                                                              |
| D9  | Split `CLAUDE.md` per app?               | **Yes**: `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md`. The root keeps the overview, commands and workflow.                         | Less always-loaded context, and the app rules load when an agent works in that app. It's optional and can be done later.                                                                                                                                |
| D10 | `AGENTS.md`                              | **Skip it**, unless you use another agent (§5).                                                                                     | One source of instructions.                                                                                                                                                                                                                             |
| D11 | Telemetry                                | **Opt out**: `openspec config set telemetry.enabled false` on your machine, plus `OPENSPEC_TELEMETRY=0` in `.claude/settings.json`. | It's anonymous, so this is your preference. CI is already off.                                                                                                                                                                                          |
| D12 | Prettier hook                            | **Yes** (§4.5).                                                                                                                     | Keeps generated markdown and code in repo style with no manual `format` run.                                                                                                                                                                            |

---

## 7. Implementation plan

```
T1 install + init ──┬─► T2 config.yaml ──────────────┐
                    ├─► T5 CLAUDE.md, READMEs ───────┤
                    ├─► T6 settings.json ────────────┼─► T8 first change (baseline specs) ─► T9 PR
                    └─► T7 CI + PR template ─────────┤
T3 CONTEXT.md ───────────────────────────────────────┤
T4 ADRs ─────────────────────────────────────────────┘
```

Run the tasks one at a time in numeric order, with one commit each. T3 and T4 don't depend on T1, but they're quick, so there's no real gain in running them in parallel.

### T1: install and initialize OpenSpec

1. Install the CLI: `npm i -g @fission-ai/openspec@1.15.0` (or `brew install openspec`). Check with `openspec --version`, which should print `1.15.0`.
2. Optional (D11): `openspec config set telemetry.enabled false`.
3. Profile (D5): run `openspec config profile`, then select core + `continue` + `verify` and keep delivery `both`. This is a machine-wide setting.
4. Run `openspec init --tools claude` at the repo root. Expect "Created: Claude Code", 8 skills + 8 commands in `.claude/`, and "Config: openspec/config.yaml (schema: spec-driven)".
5. Check that nothing outside `openspec/` and `.claude/{skills/openspec-*,commands/opsx}` changed (`git status`), and that the 3 existing skill symlinks are intact.
6. Run `pnpm exec prettier --check openspec .claude/commands .claude/skills/openspec-*`. If it complains about the generated files, add `.claude/skills/openspec-*` and `.claude/commands/opsx` to a root `.prettierignore` (they're regenerated anyway).
7. Restart Claude Code and check that `/opsx:` lists explore, propose, apply, update, sync, archive, continue and verify.

**Done when:** `openspec validate --all --strict --no-interactive` prints "No items found to validate." and exits 0.

**Commit:** `T1: add OpenSpec (init for Claude Code)`

### T2: `openspec/config.yaml`

1. Replace the generated comments with §4.1.
2. Check it:
   - `openspec new change tmp-config-check`;
   - `openspec instructions proposal --change tmp-config-check --json` shows the `context` and the `proposal` rules (no "dropped" warnings on stderr);
   - `rm -r openspec/changes/tmp-config-check`.

**Commit:** `T2: OpenSpec project config`

### T3: `CONTEXT.md`

1. Use the `domain-modeling` skill to create `CONTEXT.md` from §4.2. Challenge each term against the code: for example, check that the UI says "rating" and not "votes".

**Commit:** `T3: add domain glossary (CONTEXT.md)`

### T4: `docs/adr/`

1. Create `docs/adr/0001…0005` from §4.3 in the domain-modeling ADR format. Use 1-3 sentences each, and add "Considered Options" only where the rejected option is worth remembering (e.g. 0003: an idempotent GET + a separate "mark seen" POST).

**Commit:** `T4: seed ADRs`

### T5: `CLAUDE.md`, `README.md`, `brainstorm/`

1. `CLAUDE.md`: replace "Workflow conventions" with §4.4, and add one line under "What this is" pointing to `CONTEXT.md`.
2. Optional (D9): move "Architecture → API" into `apps/api/CLAUDE.md` and "Architecture → Web" into `apps/web/CLAUDE.md`. In the root, keep a two-line pointer to each.
3. `README.md`: rewrite it (§4.7).
4. `brainstorm/README.md`: add the frozen notice. `git rm brainstorm/template.md`.
5. `git mv brainstorm/2026102502__141-chore-init-sdlc/2__sdd-feature-workflow.md docs/sdd-workflow.md`. Drop its "Status: draft" line, and update the link in §3 of this file.

**Done when:**

- `rg -n "brainstorm" CLAUDE.md` matches only the "frozen" line;
- `CLAUDE.md` links `docs/sdd-workflow.md`.

**Commit:** `T5: document the spec-driven workflow`

### T6: `.claude/settings.json`

1. Create it from §4.5. Build the hook with the `update-config` skill, and test it: edit a `.ts` file with bad formatting and check that it gets reformatted.
2. `.gitignore`: add `.claude/settings.local.json`.

**Done when:** an `openspec status` call by the agent doesn't prompt, and reading `apps/api/.env.production.local` is refused.

**Commit:** `T6: project Claude Code settings`

### T7: CI, PR template, script

1. `.github/workflows/ci.yaml`: add the "Validate specs" step (§4.6).
2. `.github/pull_request_template.md` (§4.6).
3. Root `package.json`: add the `spec:validate` script.

**Done when:** `pnpm spec:validate` exits 0 locally, and the CI step passes on the PR.

**Commit:** `T7: validate OpenSpec in CI, PR template`

### T8: the first OpenSpec change, baseline specs

This dogfoods the whole loop on a change that doesn't touch code.

1. `openspec new change 141-chore-init-sdlc`. Then write `ask.md`: "Capture the current behavior of auth, notes, feed and dashboard as baseline specs. Scope: `brainstorm/2026102502__141-chore-init-sdlc/1__analysis-and-plan.md` §4.8."
2. `/opsx:propose 141-chore-init-sdlc` (choose "continue"). Expect:
   - `proposal.md` with 4 new capabilities;
   - 4 delta specs, each with `## Purpose` and only `ADDED` requirements;
   - no `design.md` (nothing to decide);
   - `tasks.md`: one group per capability, each scenario checked against the code.
3. Review the specs (this is the part that matters). Then `openspec validate 141-chore-init-sdlc --strict`.
4. In a fresh session: `/opsx:apply`. Any mismatch fixes the spec. A real bug becomes a GitHub issue, not a code change.
5. Run `/opsx:verify`, then `/opsx:archive`. Expect:
   - `openspec/specs/{auth,notes,feed,dashboard}/spec.md`;
   - the folder under `openspec/changes/archive/<date>-141-chore-init-sdlc/`;
   - ADR 0005 already exists, so there's nothing to promote.

**Done when:**

- `openspec list --specs` shows 4 capabilities;
- `openspec validate --all --strict --no-interactive` passes;
- `openspec list` shows no active changes.

**Commits:** `T8: propose baseline specs`, then `T8: baseline specs (archived)`

### T9: PR

1. Open the PR from the template, linking `openspec/specs/` for review.
2. Run a final check: `pnpm --filter api exec prisma generate && pnpm build && pnpm lint && pnpm spec:validate`.
3. Squash-merge as `141-chore-init-sdlc`.

---

## 8. Risks

| R   | Risk                                                                                                          | Mitigation                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The global CLI and the CI-pinned version drift apart.                                                         | Bump both together: `openspec version --check`, then `openspec update`, then commit the regenerated files and the CI pin in one commit. |
| R2  | The profile and delivery mode are machine-wide, so another project changes on its next `openspec update`.     | That's expected. Record the chosen profile in `CLAUDE.md` (§4.4) so it can be restored.                                                 |
| R3  | The baseline specs go stale.                                                                                  | Keep them thin and behavior-only. The PR checklist requires a delta for every behavior change.                                          |
| R4  | A partial MODIFIED requirement silently loses scenarios at archive time.                                      | The built-in instructions already warn about this. Review the delta at step 4 of the loop and run `/opsx:verify` before archive.        |
| R5  | Hand edits to `.claude/skills/openspec-*` are lost on `openspec update`.                                      | The `CLAUDE.md` rule. Customize through `config.yaml`, or fork a schema.                                                                |
| R6  | `.claude/skills/` mixes symlinks managed by `skills-lock.json` with OpenSpec-generated folders.               | Each tool manages only its own names. Check `ls -la .claude/skills` after every `openspec update` or skills update.                     |
| R7  | With delivery `both`, Claude may auto-invoke `openspec-*` skills when you say things like "propose a change". | That's mostly what you want. Use `/opsx:*` explicitly when you mean a specific step.                                                    |
