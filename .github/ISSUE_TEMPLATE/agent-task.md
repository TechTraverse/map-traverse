---
name: Agent task
about: A task shaped to be picked up by the Claude agent (`@claude` workflow). Fill in all three sections — that's the difference between a 70% and a 30% success rate.
title: "[agent] "
labels: ["agent-ready"]
---

<!--
HOW TO USE THIS TEMPLATE

1. Fill in all three sections below. Skipping any one of them dramatically
   lowers the chance the agent produces a usable PR.

2. Save the issue, then drive the agent in two steps:

   a. Comment `@claude plan` to get a plan posted as a reply. The agent will
      read this issue, the relevant skills, and the existing code, then
      post a structured plan with any clarifying questions. It will NOT
      modify any files in plan mode.

   b. Read the plan. Reply with clarifications or corrections in a normal
      comment if anything is off. When you're satisfied, comment
      `@claude implement` and the agent will execute the plan, run
      `pnpm verify`, and open a PR.

3. The agent will read .claude/skills/project-conventions/SKILL.md and any
   other relevant skills automatically. The workflow lives at
   .github/workflows/claude.yml.
-->

## What needs to happen

<!--
A single concrete change. One sentence is ideal. Two is fine. A bulleted list
of three semi-related things is a sign the issue should be split.

Good: "Add a `useOgcQueryables` hook in packages/map-ui-lib/src/hooks/ that
fetches /collections/{id}/queryables and returns { queryables, loading, error }."

Bad: "Improve the queryables story" — no acceptance criterion.
-->



## Acceptance criteria

<!--
How will we know it's done? List things that are objectively checkable. The
agent will run `pnpm verify` and look at this section to decide whether to
hand off the PR.

Good:
- [ ] `useOgcQueryables.ts` exists and exports `useOgcQueryables` and `UseOgcQueryablesResult`
- [ ] A matching `useOgcQueryables.stories.tsx` renders against http://localhost:8000
- [ ] `pnpm verify` is green
- [ ] Re-exported from `packages/map-ui-lib/src/hooks/index.ts` and `main.ts`
-->



## Pointers

<!--
Where should the agent look first? Filenames, similar features, related
skills. The more concrete, the better. The agent has the whole repo but
context is finite — pointing at the right two files saves a lot of guessing.

Example:
- Pattern reference: `packages/map-ui-lib/src/hooks/useOgcCollections.ts`
- Util to extend: `packages/map-ui-lib/src/utils/ogcApi.ts`
- Skill to read first: `.claude/skills/add-ogc-hook/SKILL.md`
-->


