# Agent Workflow

This repository uses `biome` as the authoritative formatter and linter, and `tsc --noEmit` as the authoritative TypeScript correctness check.

## Shell command rule

When an agent runs shell commands directly in this repository, prefix them with `rtk`.

Examples:

- `rtk pnpm run biome:check`
- `rtk pnpm run biome:write`
- `rtk pnpm run typecheck`
- `rtk pnpm test`

## Required validation loop

Before finishing any code change:

1. Run `rtk pnpm run biome:check`.
2. If `biome` reports errors or formatting changes, apply `rtk pnpm run biome:write` or make the smallest correct manual fix.
3. Re-run `rtk pnpm run biome:check`.
4. Run `rtk pnpm run typecheck`.
5. Do not consider the task finished while `biome` or `tsc --noEmit` is failing.

Treat `biome` output as authoritative over stylistic preference, and treat `tsc --noEmit` as authoritative over TypeScript type assumptions.

## React and TSX rules

When editing React or TSX files:

- keep hooks at the top level of components and custom hooks
- prefer semantic HTML over ARIA role workarounds
- associate labels and controls with `htmlFor` and `id` when needed
- do not ignore accessibility findings reported by `biome`

## Local verification targets

- `rtk pnpm run biome:check`
- `rtk pnpm run typecheck`
- `rtk pnpm run test`

If a task only changes formatting or lint violations, `biome` passing is the minimum completion bar. Otherwise, both `biome` and `tsc --noEmit` must pass before considering the task complete.
