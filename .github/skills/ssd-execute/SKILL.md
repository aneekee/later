# sdd-execute

Execute the To Do items from an SDD file, implementing the code changes they describe. Mark each item as completed in the SDD file immediately after finishing it.

## When to use

User references an SDD markdown file and asks to implement it — all of it, or a named subset (e.g. "only backend", "only the Types and Backend sections", "just the frontend").

## Input

- **SDD file** — one file path or URI pointing to an SDD markdown file with a populated `## To Do` section (produced by the `sdd-todo` skill).
- **Scope** (optional, from user message) — one or more section names or free-form phrases that narrow which items to execute: `Types`, `Backend`, `Frontend`, or a combination. If no scope is given, execute everything.

Example invocations:

```
#file:.github/skills/ssd-execute/SKILL.md #file:sdd/2026052302__33.../0__init.md implement backend only
#file:.github/skills/ssd-execute/SKILL.md #file:sdd/2026052302__33.../0__init.md
```

## Step-by-step instructions

### 1. Read the SDD file

Read the full SDD file. Extract:

- The **Overview** — understand the feature intent and constraints.
- The **To Do** section — collect all items grouped under their section headers (`### Types`, `### Backend`, `### Frontend`, etc.).

### 2. Determine scope

If the user specified a scope, filter to only the matching section(s). If no scope was given, include all sections.

Skip items already checked (`- [x]`). Never re-implement a completed item.

### 3. Explore the codebase

Before writing any code, read the files referenced in the todo items you are about to implement. Also read closely related files to understand:

- Existing patterns (naming conventions, file structure, how similar things are done).
- Imports and exports that the new code must integrate with.
- Any types or interfaces the new code depends on.

Do **not** explore beyond what is needed. Stop when you have enough context to act confidently.

### 4. Execute items one at a time

Work through the filtered, unchecked items **in the order they appear** in the SDD (Types → Backend → Frontend). For each item:

1. Implement the change — edit or create the files described in the todo item.
2. Validate — check for type errors or obvious mistakes before moving on.
3. Mark the item complete — immediately update the SDD file, changing `- [ ]` to `- [x]` for that specific item.

**Do not batch completions.** Mark each item done as soon as its code is written and validated. This gives the user an accurate live view of progress.

### 5. Integration consistency

After all items in a group are complete, verify that:

- Exported names match what importers expect.
- New API endpoints follow the same auth/guard/decorator patterns as existing ones in that controller.
- New React components follow the same prop conventions and are exported consistently with sibling components.
- New RTK Query hooks are exported from the same barrel file as existing hooks.

Fix any integration issues before moving on.

### 6. Do not over-implement

- Implement **only** what the todo item says.
- Do not add extra features, refactor unrelated code, add comments, or improve things not mentioned in the SDD.
- If an item is ambiguous and you cannot infer the correct implementation from the codebase context, add a comment `// TODO: clarify — <question>` at the relevant location and **do not** mark the item complete. Note it at the end of your response.

## Constraints

- **Respect completed items** — never modify code already produced for a `- [x]` item unless a later item explicitly builds on it.
- **SDD file is the source of truth** — if the overview and the todo item conflict, follow the todo item (it was written after the overview was reviewed).
- **Atomic file writes** — complete each file in one pass rather than writing partial stubs and returning.
- **No guessing on paths** — always verify a file exists before importing from it. If a file doesn't exist yet and it is part of the current scope, create it.
