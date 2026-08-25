# apps/storybook — runs Storybook, owns no components

Project-wide rules live in the root `AGENTS.md`. See `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md` for the full reasoning behind this app's existence.

## What this app is

Just a Storybook runner. It has no components, no pages, no routes of its own — `.storybook/main.ts`'s `stories` glob scans story files where they actually live (`apps/web/app/**/*.stories.tsx` for web's own components, `packages/ui/src/**/*.stories.tsx` for shared ones) rather than requiring them to move here. When `apps/admin` eventually has its own reusable components worth documenting, add a third glob root here rather than duplicating this whole setup into `apps/admin`.

## Running

- `pnpm --filter storybook-app storybook` — dev server on port 6006.
- `pnpm --filter storybook-app build-storybook` — static build to `storybook-static/` (gitignored).
- `pnpm --filter storybook-app lint` / `typecheck` — only cover this app's own `.storybook/*.ts(x)` config files, not the story files it discovers elsewhere (those are linted/typechecked by whichever app/package actually owns them).

## Design tokens come from apps/web specifically

`.storybook/preview.tsx` imports `../../web/app/globals.css` for Tailwind's `@theme` tokens (`--primary`, `--background`, etc.) — a deliberate, explicit choice, not an accident. Design tokens aren't extracted to `packages/ui` yet (`apps/web`'s and `apps/admin`'s copies are identical today, per `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md`), so this file has to pick one. If the two ever diverge, decide deliberately which one Storybook should visually match — don't just leave it pointed at whichever was here first.

## Own Tailwind config required — don't assume it's inherited

This app has its own `postcss.config.mjs` + `tailwindcss`/`@tailwindcss/postcss` devDependencies, separate from `apps/web`'s. Importing `apps/web/app/globals.css` does **not** bring `apps/web`'s Tailwind pipeline along with it — without this app's own config, `@import "tailwindcss"` silently produces zero utility classes (custom `@theme` properties still pass through fine, since those are plain CSS, which is what made this bug easy to miss: the build succeeds, some CSS shows up, just not the actual utility classes). Confirmed by grepping the built CSS for a class that only exists in `packages/ui` (`z-30`) and finding it absent before this config was added, present after.
