# GitHub Agent Pipeline

This project uses Claude as an automated development agent triggered through GitHub Issues and PRs. The pipeline supports three trigger mechanisms that all funnel into the same workflow.

## Pipeline Stages

| Stage | Label | Comment trigger | What happens |
|-------|-------|----------------|-------------|
| **Clarify** | `status:clarify` | `@claude clarify` | Agent reads the issue, asks questions, proposes acceptance criteria |
| **Plan** | `status:ready` | `@claude plan` or `@claude ready` | Agent posts a detailed implementation plan as a comment |
| **Implement** | `status:in-progress` | `@claude implement` | Agent creates a branch, implements the plan, opens a PR |
| **Review** | `status:in-review` (on PR) | `@claude review` | Agent reviews the PR, runs tests, approves or requests changes |
| **Merge** | — | — | **Human only.** Agent cannot merge. |

## Trigger Methods

All three methods are equivalent — use whichever is most convenient:

**1. Labels** — Apply a label to an issue or PR. The workflow fires automatically.

**2. Comments** — Comment on the issue with `@claude <command>`. The workflow fires and the comment keyword determines the mode.

**3. Project board** — Drag an item to a column in the GitHub Project. Configure the project's built-in automation to apply the corresponding label (see setup below).

## Setup

### 1. Create the labels

Create these labels in your repository (Settings → Labels):

- `status:clarify` — color: `#d4c5f9` (purple)
- `status:ready` — color: `#0e8a16` (green)
- `status:in-progress` — color: `#fbca04` (yellow)
- `status:in-review` — color: `#1d76db` (blue)

### 2. Set up repository secrets

The workflow requires two secrets (Settings → Secrets and variables → Actions):

- `ANTHROPIC_API_KEY` — your Anthropic API key
- `GITHUB_TOKEN` — automatically provided by GitHub Actions (no setup needed)

### 3. Create a GitHub Project board (optional)

If you want the visual board experience:

1. Create a new GitHub Project (Projects tab → New project → Board).
2. Add columns: **Backlog**, **Clarify**, **Ready**, **In Progress**, **In Review**, **Done**.
3. Set up automation rules (Project settings → Workflows):
   - When item moves to **Clarify** → add label `status:clarify`
   - When item moves to **Ready** → add label `status:ready`
   - When item moves to **In Progress** → add label `status:in-progress`
   - When item moves to **In Review** → add label `status:in-review`
   - When item moves to **Done** → close the issue
   - When PR is merged → move to **Done**

This creates two-way sync: moving a card applies the label which triggers the agent, and the agent's actions (opening PRs, etc.) can be reflected on the board.

## Usage Examples

### Full pipeline (label-driven)

```
1. Create issue: "Add scale bar control component"
2. Apply label: status:clarify
   → Agent comments with questions and proposed acceptance criteria
3. Answer questions in comments
4. Apply label: status:ready
   → Agent comments with a detailed plan
5. Review the plan, adjust if needed
6. Apply label: status:in-progress
   → Agent creates branch, implements, opens PR
7. Apply label: status:in-review (to the PR)
   → Agent reviews code, approves or requests changes
8. Human merges the PR
```

### Quick path (comment-driven)

```
1. Create issue with detailed requirements
2. Comment: @claude plan
   → Agent posts plan
3. Comment: @claude implement
   → Agent opens PR
4. Comment on PR: @claude review
   → Agent reviews
5. Human merges
```

### Implement with a custom base branch

```
@claude implement --base ai/main
```

This branches from `ai/main` instead of `main` and targets the PR against it.

### Freeform interaction

```
@claude can you check if the ExportModal handles empty feature collections?
```

Any `@claude` mention that doesn't match a specific mode keyword falls through to the default freeform mode.

## Review Cycle

When the review agent requests changes:

1. A human (or another `@claude implement` run on the PR) pushes fix commits.
2. Remove and re-apply the `status:in-review` label to trigger a re-review.
3. The review agent checks the new changes and approves or requests further changes.

The review agent checks:
- `pnpm verify` passes (automatic failure if not)
- No MapLibre imports in the lib
- Controlled component pattern (props + callbacks)
- `mapui:` Tailwind prefix in lib code
- Storybook stories for new components
- Schema test fixtures for config changes
- Code quality (naming, types, error handling, dead code)

## Cost Controls

- **Clarify mode:** 15 max turns (lightweight, mostly reading)
- **Plan mode:** 20 max turns (reading + one comment)
- **Implement mode:** 60 max turns (full coding session)
- **Review mode:** 30 max turns (reading + review submission)
- **Default mode:** 30 max turns
- **Timeout:** 30 minutes per run
- **Concurrency:** one run per issue/PR at a time (no duplicate fanout)
