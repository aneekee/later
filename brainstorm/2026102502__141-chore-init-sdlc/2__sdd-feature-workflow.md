# Spec-driven workflow: building a feature with OpenSpec

- **Status:** draft, written for #141. In T5 it moves to `docs/sdd-workflow.md`, and `CLAUDE.md` links to it.
- **Assumes:** #141 is done (T1..T8):
  - the `openspec` CLI 1.15.x is on PATH;
  - `openspec/config.yaml` is filled in;
  - `CONTEXT.md` exists;
  - the baseline specs (`auth`, `notes`, `feed`, `dashboard`) exist.
- **Roles:** **you** are the owner: you decide, review and merge. **Claude** is the agent in a Claude Code session.
- The running example is a made-up feature, `170-feature-edit-notes`. The full example is at the end.

## The loop

```
issue #170
  │
  ▼
STEP 0  branch + `openspec new change` + ask.md                          you
  │
  ▼
STEP 1  /opsx:explore → grill            (session 1, no code)           you + Claude
STEP 2  /opsx:propose                    (same session)                  Claude
  │
  ▼
STEP 3  REVIEW GATE: proposal → specs → design → tasks                   you
        openspec validate --strict, commit "plan"
  │
  ▼
STEP 4  /opsx:apply                      (session 2, fresh context)      Claude
        one commit per task group, resumable
  │
  ▼
STEP 5  /opsx:verify + the gate + a manual check of every scenario       Claude + you
  │
  ▼
STEP 6  /opsx:archive                    (last commit of the PR)         Claude
        specs updated, folder archived, ADRs and CONTEXT.md updated
  │
  ▼
STEP 7  PR → CI → squash-merge → owner-only follow-ups                   you
```

**Three rules hold the loop together:**

1. **The files are the only memory between sessions.** Anything decided in chat that isn't in the change folder is lost when the session ends.
2. **No code before the review gate, and no behavior change during apply without `/opsx:update`.** The specs and the code must agree at every commit after the plan.
3. **One change has one intent you can say in one sentence.** If it needs "and also", split it.

---

## Step 0: issue, branch, change folder (you)

```sh
git switch main && git pull
git switch -c 170-feature-edit-notes
openspec new change 170-feature-edit-notes
```

- **The name** is `<issue#>-<type>-<slug>`, the same as the branch. OpenSpec rejects uppercase letters, `_` and `--`.
- `openspec new change` creates `openspec/changes/170-feature-edit-notes/` with a `.openspec.yaml` file.
- **Write `ask.md`** in that folder: the raw ask, verbatim, typos included. It's the input that every later artifact traces back to, and nobody rewrites it.
- Optional: an `analysis.md` next to it, for long research notes (like #157's `1__analysis.md`). Neither file is an OpenSpec artifact. `validate` ignores them, and archive keeps them.

## Step 1: explore and grill (session 1)

Start a **fresh** Claude Code session:

```
/opsx:explore 170-feature-edit-notes
grill me
```

**What Claude does:**

- reads `ask.md`, `CONTEXT.md`, the related specs (`openspec list --specs`, then `openspec show notes --type spec`) and the code;
- maps the current flow: route → service → DB on the API side, and RTK Query API → cache → component on the web side;
- asks the decision questions (grilling skill);
- writes no files, unless you ask it to.

**The decision tree, typical for this repo:**

| Branch   | Questions to settle                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope    | What's in, and what's explicitly out (and for later)?                                                                                               |
| Behavior | Exact limits, error status codes and messages, ordering, page sizes.                                                                                |
| Data     | Does the Prisma schema change? Is there a migration, a rename (hand-written `ALTER … RENAME`) or a backfill script under `apps/api/sql/backfills/`? |
| Web      | Keys, focus, pending state, error toast; optimistic or pessimistic.                                                                                 |
| Feed     | Does it change the seen time, the rating or the rotation? The feed cache is never refetched, only patched.                                          |
| Types    | Which `@later/types` shapes change?                                                                                                                 |
| Verify   | Which scenarios are clicked through by hand, and which are worth a jest test?                                                                       |

**Done when:**

- no open question would change the specs, the approach or the tasks;
- any new domain term is in `CONTEXT.md` (via the `domain-modeling` skill, right away).

## Step 2: propose (session 1)

```
/opsx:propose 170-feature-edit-notes
```

The folder already exists, so answer "continue". Claude writes the artifacts in dependency order:

| File                           | Contents                                                                                                                                                                      | Built from                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `proposal.md`                  | **Why** (with the issue number, 50..1000 chars), **What Changes** ending with **Out of scope**, **Capabilities** (new or modified, exact paths), **Impact**                   | `ask.md` + the scope answers |
| `specs/<capability>/spec.md`   | The delta: `ADDED` / `MODIFIED` / `REMOVED` / `RENAMED` requirements, with WHEN/THEN scenarios                                                                                | the behavior answers         |
| `design.md` (only when needed) | Context, Goals / Non-Goals, **Decisions** (each grilled decision, with the rejected alternatives), data model and migrations, raw SQL, `@later/types` changes, Migration Plan | the technical answers        |
| `tasks.md`                     | `## N. Group` = one commit; `- [ ] N.M` tasks that name their files and their verification; the gate at the end of each group; owner-only steps under `## Workflow follow-up` | all of the above             |

**For a large change** (#157-sized), use `/opsx:continue 170-…` in place of `propose`. It writes one artifact per call, so you can review and grill each one before the next is built on it.

## Step 3: review gate (you)

Read in this order, and stop at the first artifact that's wrong: everything after it is built on it.

**`proposal.md`**

- [ ] Every point in `ask.md` is either in What Changes or under Out of scope.
- [ ] The capabilities reuse existing paths (`openspec list --specs`), with no near-duplicates (e.g. `note-editing` next to `notes`).
- [ ] Impact names the api, web, types and DB parts the change touches.

**`specs/`** (this is the part that outlives the change)

- [ ] Each requirement is one behavior, written with SHALL or MUST.
- [ ] Each requirement has at least one `#### Scenario:`, including the error and edge cases.
- [ ] Numbers are exact: limits, status codes, messages, page sizes.
- [ ] A behavior that spans the API and the web app has a scenario for each side.
- [ ] A MODIFIED block is the **whole** requirement, copied from `openspec/specs/…`, with an identical header.
- [ ] There are no class names, file paths or libraries; those belong in `design.md`.
- [ ] `openspec show 170-feature-edit-notes --deltas-only` reads like what you agreed.

**`design.md`** (if there is one)

- [ ] Each grilled decision is a Decision, with its alternatives.
- [ ] A Prisma change has a migration section: rename = `--create-only` + hand-written `ALTER … RENAME`; the backfill script; the order of steps on prod.
- [ ] No Open Question would change the specs or the tasks.

**`tasks.md`**

- [ ] Each group is one commit that leaves the build green and ends with the gate.
- [ ] Each task names its files and says how it's verified (a command, a curl, a click).
- [ ] Tests and docs sit in the group whose work needs them, not in a catch-all group at the end.
- [ ] Every scenario is covered by at least one task.
- [ ] Owner-only steps (a prod migration, a backfill) sit under `## Workflow follow-up`.

**To fix something,** edit the file yourself, or run `/opsx:update 170-feature-edit-notes` with what to change (e.g. "editing must not change the rating"). `update` revises the artifacts, keeps them consistent with each other and never touches code.

**Close the gate:**

```sh
openspec validate 170-feature-edit-notes --strict
git add openspec/changes/170-feature-edit-notes
git commit -m "170: plan"
```

## Step 4: apply (session 2, fresh context)

Start a **new** session. The grilling context (rejected options, dead ends) stays behind, and only the files carry over.

```
/opsx:apply 170-feature-edit-notes
```

- Claude reads `CLAUDE.md`, `CONTEXT.md` and the change's proposal, specs and design (the `config.yaml` apply guidance says so). Then it works group by group, checking tasks off and **committing after each group**. It never pushes.
- **Interrupted?** Run `/opsx:apply 170-feature-edit-notes` again, and it resumes at the first unchecked task. To see the progress: `openspec status --change 170-feature-edit-notes`.
- **The plan is slightly wrong** (a file name differs, a missing import): Claude makes the minimal fix and notes it under the task.
- **The plan is wrong in a way that changes behavior:** Claude stops. You run `/opsx:update` on the specs (and tasks), re-read the delta, then apply again.
- **The scope grows:** don't stretch the change. Open a new issue, and later a new change.
- **Parallel groups,** only where `tasks.md` says they're safe: run each in its own git worktree and session, and merge them before the next dependent group.

## Step 5: verify (session 2)

```
/opsx:verify 170-feature-edit-notes
```

- **Verify checks three things:** completeness (every task and scenario is covered), correctness (the code does what the scenarios say) and coherence (the design was followed).
- **It reports findings at three levels:**
  - **CRITICAL:** fix it before archiving.
  - **WARNING:** decide: fix it, or accept it and say why in the PR.
  - **SUGGESTION:** optional.

  Verify doesn't block archive, so this triage is the real gate.

- **Run the gate:** `pnpm --filter api exec prisma generate && pnpm build && pnpm lint`.
- **Check every scenario by hand:**
  - in the browser: start the `api` and `web` servers from `.claude/launch.json` (ports 3000 and 5175);
  - or with curl and the `access_token` cookie from a local test user's login;
  - Swagger is at `/api/docs`.

  Raw SQL is checked only at runtime, so a route that uses it must actually be called.

## Step 6: archive (session 2, last commit of the PR)

```
/opsx:archive 170-feature-edit-notes
```

**What archive does:**

- validates the change, warns about unchecked tasks and offers to sync the deltas;
- merges the deltas into `openspec/specs/notes/spec.md`: ADDED is appended, MODIFIED replaces, REMOVED is dropped, RENAMED renames;
- moves the folder, `ask.md` included, to `openspec/changes/archive/2026-11-02-170-feature-edit-notes/`.

**Then, per the `config.yaml` archive guidance:**

- a Decision that is hard to reverse, surprising, and the result of a real trade-off → `docs/adr/NNNN-….md`;
- a new term → `CONTEXT.md`.

**Finish:**

```sh
openspec validate --all --strict --no-interactive
openspec list                        # no active change left for this branch
git add -A && git commit -m "170: archive the change, update specs"
```

## Step 7: PR and merge (you)

- Open the PR from the template. Link the archived change folder and put the delta spec first, so the review reads proposal → specs → code.
- CI runs build, lint and "Validate specs".
- Squash-merge it as `170-feature-edit-notes`.
- After the merge, run the owner-only steps from `## Workflow follow-up` (e.g. `prisma migrate deploy` on prod, a backfill script).

---

## Variants

| Situation                                                    | What changes in the loop                                                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Small, obvious UI or API tweak                               | Skip step 1 and run `/opsx:propose` with the ask. There's usually no `design.md`. Behavior still changes, so there's still a delta.                                            |
| Chore, tooling, docs, pure refactor                          | Set `skip_specs: true` in `.openspec.yaml`. Write the proposal and tasks only. Say in Why that no observable behavior changes.                                                 |
| Bug fix, and the spec already describes the correct behavior | Set `skip_specs: true`. Why names the requirement and scenario the code breaks.                                                                                                |
| Bug fix, and the spec doesn't cover the case                 | MODIFIED: the whole requirement, plus a new scenario that captures the bug, so it can't come back unnoticed.                                                                   |
| Large or cross-cutting change (#157-sized)                   | `/opsx:continue` one artifact at a time; `analysis.md` for the research; a dependency table on top of `tasks.md`; more, smaller groups.                                        |
| Removing a feature                                           | REMOVED with **Reason** and **Migration**. If it was a capability's last requirement, also set `retire_capabilities: true` in `.openspec.yaml`, and archive deletes that spec. |
| The spec is wrong but the code is right                      | A small change with a MODIFIED delta, so the history records it. Fix a pure typo or a `TBD` Purpose directly in `openspec/specs/…`.                                            |
| Two open changes touch the same requirement                  | The second one to archive resolves the conflict in `openspec/specs/…/spec.md` like a merge conflict, keeping what the code actually does.                                      |
| A follow-up needs the new spec before this PR merges         | `/opsx:sync 170-…` merges the deltas into `openspec/specs/` without archiving.                                                                                                 |

---

## Worked example: `170-feature-edit-notes` (made up)

This shows where each piece of the conversation ends up. The names follow the current code (`CreateNoteDto`, `notesApi`, `FeedItem.tsx`), but the feature doesn't exist.

### `ask.md`

```
I want to edit a note's text from the feed
Double click on the text opens an editor, Enter saves, Esc cancels
Don't touch the rating and the seen time
```

### `proposal.md`

```md
# Proposal

## Why

Notes can only be created, rated and deleted (#170). Fixing a typo means deleting the note, which loses its rating and its place in the rotation.

## What Changes

- Editing a note's text, with the same rules as creating one.
- In the feed, double-clicking a note's text opens an editor. Enter saves, Esc cancels.

### Out of scope

- Edit history and an "edited" marker.
- Editing anywhere other than the feed.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `notes`: adds editing a note's text; the owner check now covers editing.

## Impact

- API: the `notes` module (a new route and DTO). Types: `@later/types` `notes.ts`. Web: the feed card and the notes API. No DB change.
```

### `specs/notes/spec.md` (delta)

```md
# Spec Delta

## ADDED Requirements

### Requirement: Edit a note's text

The system SHALL let the owner replace a note's text, following the rules for creating a note: not blank, at most 1000 characters. Editing SHALL NOT change the note's rating or seen time.

#### Scenario: Owner edits a note

- **WHEN** the owner sends new non-blank text of at most 1000 characters for their note
- **THEN** the note's text is replaced and the updated note is returned
- **AND** its rating and seen time are unchanged

#### Scenario: Blank or too long text

- **WHEN** the new text is whitespace-only or longer than 1000 characters
- **THEN** the API responds 400 and the note is unchanged

#### Scenario: Edit in the feed

- **WHEN** the user double-clicks a note's text in the feed, changes it and presses Enter
- **THEN** the card shows the new text in place, without reloading the feed

#### Scenario: Cancel an edit

- **WHEN** the user presses Esc while editing
- **THEN** the card shows the original text and nothing is sent

## MODIFIED Requirements

### Requirement: Only the owner can change a note

The system SHALL reject rating, editing or deleting a note that doesn't exist or belongs to another user, with 403 "You don't have access to this note".

#### Scenario: Someone else's note

- **WHEN** a user rates, edits or deletes a note they don't own
- **THEN** the API responds 403 "You don't have access to this note" and the note is unchanged

#### Scenario: Missing note

- **WHEN** a user rates, edits or deletes a note id that doesn't exist
- **THEN** the API responds 403 "You don't have access to this note"
```

The MODIFIED block is the baseline requirement copied whole from `openspec/specs/notes/spec.md`, with "editing" added. Copying only the changed sentence would drop the other scenarios on archive.

What isn't in the spec: the route shape, the DTO, the RTK Query cache patch. Those can change without changing what the user sees, so they belong in `design.md`.

### `design.md` (short)

```md
# Design

## Context

Notes are changed through `v1/notes` (create, rating, delete). The web app patches the feed cache and never refetches it (see CLAUDE.md, the feed cache rule).

## Decisions

- **`PATCH v1/notes/:noteId` with `{ content }`.** Alternative: `PUT v1/notes/:noteId/content`, mirroring the rating route. Rejected: PATCH leaves room for other editable fields.
- **A pessimistic save, like note create.** Alternative: an optimistic cache patch with rollback. Rejected: it adds rollback code for a rare action, and a failed save keeps the text in the editor anyway.
- **Validation reuses the create rules** (`NOTE_MAX_LENGTH`, the non-blank check), so the two can't drift apart.

## Risks / Trade-offs

- [The edit races a feed page load] → The cache patch only touches the edited note's id, so other pages aren't affected.
```

### `tasks.md`

```md
# Tasks

Run the groups in order: group 2 needs the types and the route from group 1.

## 1. API: edit route

- [ ] 1.1 `packages/types/src/notes.ts`: add `UpdateNoteRequestBody { content }` and `UpdateNoteSuccessResponse`; verify with `pnpm check-types`
- [ ] 1.2 `apps/api/src/notes/notes.dto.ts`: `UpdateNoteDto` with the same validators as `CreateNoteDto`; verify in Swagger that whitespace-only text and 1001 chars return 400
- [ ] 1.3 `notes.service.ts` and `notes.controller.ts`: `PATCH v1/notes/:noteId`, which calls `checkNoteAccess` and updates only the text; verify with curl: your own note returns 200 with the rating and seenAt unchanged; another user's note returns 403
- [ ] 1.4 Gate: `pnpm --filter api exec prisma generate`, `pnpm build`, `pnpm lint`

## 2. Web: edit in the feed card

- [ ] 2.1 `features/notes/api/notes.api.ts`: an `updateNote` mutation that patches the feed cache with `updateQueryData` (no refetch, no invalidation); verify that the network tab shows no feed request after a save
- [ ] 2.2 `features/feed/components/FeedItem.tsx`: double-click opens the editor, Enter saves, Esc cancels, and on error the text stays and the error toast shows; verify each case in the browser
- [ ] 2.3 Gate: `pnpm build`, `pnpm lint`
```

---

## Cheat sheet

### Commands

| When          | In Claude Code                                    | CLI                                                         |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Start         |                                                   | `openspec new change <name>`                                |
| Explore       | `/opsx:explore [name]`                            | `openspec list --specs`, `openspec show <spec> --type spec` |
| Plan          | `/opsx:propose <name>` or `/opsx:continue <name>` | `openspec status --change <name>`                           |
| Revise a plan | `/opsx:update <name>`                             | `openspec validate <name> --strict`                         |
| Read a delta  |                                                   | `openspec show <name> --deltas-only`                        |
| Build         | `/opsx:apply <name>`                              | `openspec instructions apply --change <name>`               |
| Check         | `/opsx:verify <name>`                             | `pnpm spec:validate`                                        |
| Sync early    | `/opsx:sync <name>`                               |                                                             |
| Finish        | `/opsx:archive <name>`                            | `openspec archive <name>`                                   |
| Overview      |                                                   | `openspec view`, `openspec list`                            |

### Spec format (what `validate --strict` and archive rely on)

- **Delta sections:** `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, `## RENAMED Requirements` (written with `FROM:` / `TO:`).
- **Requirements:**
  - `### Requirement: <name>`, then a description of at most 500 chars, written with SHALL or MUST;
  - one behavior per requirement;
  - move examples into scenarios.
- **Scenarios:**
  - `#### Scenario: <name>`, with **exactly four** `#`; three `#` or plain bullets fail silently;
  - then `- **WHEN** …`, `- **THEN** …`, `- **AND** …`;
  - every requirement needs at least one.
- **MODIFIED** is the whole requirement, all scenarios included, and its header matches the existing one exactly.
- **REMOVED** has **Reason** and **Migration**.
- **A new capability** starts its delta with `## Purpose` (one or two sentences, 50+ chars). A delta for an existing capability has no Purpose section.

### Definition of done

- [ ] Every task in `tasks.md` is checked.
- [ ] `/opsx:verify` has no CRITICAL findings, and each WARNING was fixed or explained in the PR.
- [ ] The gate is green, and every scenario was checked by hand (or by a test).
- [ ] The change is archived, `openspec validate --all --strict` passes, and `openspec list` shows nothing active for this branch.
- [ ] `CLAUDE.md`, `CONTEXT.md` and `docs/adr/` are updated where the change affects them.
- [ ] The PR is squash-merged, and the owner-only follow-ups are done.

### Anti-patterns

- **Writing code during explore or propose.** The plan stops being reviewable once code exists to defend it.
- **Applying in the grilling session.** The context is full of rejected options. Start apply in a fresh session.
- **Implementation detail in specs** ("NotesService calls prisma.note.update"). It goes stale on the first refactor.
- **A partial MODIFIED block.** Archive replaces the whole requirement, so the missing scenarios disappear.
- **"Verify manually" with no detail.** Say what to click or curl, and what to expect.
- **Editing `.claude/skills/openspec-*` or `.claude/commands/opsx/`.** `openspec update` overwrites them; customize `openspec/config.yaml` instead.
- **Leaving a change active after its PR merges,** or archiving before its code is in the PR.
- **Writing specs for areas the change doesn't touch.** Specs grow with the changes.
