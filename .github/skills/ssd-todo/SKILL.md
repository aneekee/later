# sdd-todo

Refine an SDD (Software Design Document) file: fix prose, generate or update the To Do section, and surface questions when something is unclear.

## When to use

User references one or more SDD markdown files (typically under `sdd/`) and asks to generate, review, or update the To Do section.

## Input

The user provides one or more file paths or URIs pointing to SDD markdown files. Each file follows this structure (some sections may be absent on first run):

```
---
title: ...
---

## Overview
...

## Questions          ← optional; added by this skill when needed
...

## To Do              ← optional on first run; created/updated by this skill
### Backend
- [ ] ...
### Frontend
- [ ] ...
```

## Behaviour per iteration

This skill is designed to be called multiple times on the same file as the design evolves.

**Detect the current state** by reading the file:

- No `## To Do` section → **first run**: generate initial todos and ask questions when it makes sense.
- `## To Do` exists but `## Questions` has unanswered items → **revision run**: re-read questions + overview, then update todos and clear answered questions.
- `## To Do` exists, no open questions → **polish run**: review todos for completeness and fix any remaining issues.

## Step-by-step instructions

### 1. Read the SDD file(s)

Read every provided file in full. Identify:

- The **Overview** section (required).
- The **Questions** section (may be absent or may have user answers inline).
- The **To Do** section (may be absent).

### 2. Explore the codebase

Use search and file-reading tools to find all code artifacts referenced in the overview (controllers, services, components, types, API hooks, constants, etc.). Collect enough context to:

- Understand existing patterns (naming, file structure, state management, API conventions).
- Spot gaps or inconsistencies between the overview and the current codebase.
- Identify which packages own which concerns (e.g. `packages/types` for shared types, `apps/api` for backend, `apps/web` for frontend).

Do **not** read files you don't need. Stop exploring once you have enough context to act.

### 3. Fix the Overview prose

Edit the Overview section in place:

- Correct grammar and spelling.
- Remove redundant sentences.
- Use consistent terminology (e.g. don't mix "resolved notes" and "resolved chats").
- Keep it concise — one clear idea per sentence.
- Do **not** change the meaning or add new requirements.

### 4. Identify unknowns

For each thing in the overview that you cannot confidently translate into a concrete todo (missing context, ambiguous wording, conflicting requirements), formulate a short, specific question.

If there are questions:

- Add or update a `## Questions` section **between the Overview and the To Do sections**.
- Format each question as a numbered list item. If a previous question has a user answer below it, keep the answer and mark the question resolved with `~~strikethrough~~`.
- Do **not** block on questions — still generate or update the To Do section with your best interpretation, marking ambiguous items with `<!-- ? -->`.

If there are no questions, remove the `## Questions` section entirely.

### 5. Generate or update the To Do section

Write or rewrite the `## To Do` section after the Questions section (or after Overview if no Questions).

**Structure rules:**

- Group by concern: `### Types` (shared package types first, if needed), `### Backend`, `### Frontend`. Omit groups that have no items.
- Order items so that each step's output is available to the next (types before backend, backend before frontend).
- Each item is a `- [ ]` checkbox.

**Content rules for each item:**

- Start with a verb (Add, Create, Update, Extract, Remove…).
- Reference the exact file path.
- Describe **what** to do and **why** only if not obvious from context.
- Include key implementation details inline (method signatures, field names, tag names, URL paths, exact enum values) so an AI agent can act without re-reading the whole document.
- Do **not** pad with filler. One tight line per item; use a sub-list only when a step has meaningfully distinct sub-tasks.
- On revision runs: add new items, edit changed items, delete items made obsolete by answers to questions. Preserve the checked state of already-completed items (`- [x]`).

### 6. Write the changes

Apply all edits to the SDD file(s) using file-editing tools. Make all changes in a single pass — do not write partial drafts.

## Style constraints

- SDD files are living documents. Preserve the frontmatter and any section the skill does not own.
- Never create a separate summary or changelog file.
- Code symbols (file paths, function names, type names) must always be in backticks.
- Keep the Questions section minimal — only ask what genuinely blocks generating a correct todo item.
