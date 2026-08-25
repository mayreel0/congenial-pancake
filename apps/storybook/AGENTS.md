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

## `.storybook/preview.tsx`'s decorator must target `<html>`/`<body>`, not a wrapper div

Three things `apps/web/app/layout.tsx` does that Storybook never runs through (it only renders one isolated component, never that layout): loads Geist via `next/font/google`, puts `h-full`/font-variable classes on `<html>`, puts `min-h-full` on `<body>`. All three are replicated in the preview decorator via `document.documentElement.classList.add(...)` / `document.body.classList.add(...)` inside a `useEffect` — **not** by wrapping `<Story />` in a div with those classes. Two reasons this matters, both found by actually comparing a story to the real running app, not by trusting a successful build:

- `globals.css`'s `@theme inline` declares `--font-sans: var(--font-geist-sans)` at `:root`. A `var()` reference inside another custom property's value resolves against the cascade at *that property's own declaration site* — so if `--font-geist-sans` is only defined on a wrapper div deeper in the tree, `--font-sans` at `:root` still sees it as undefined, and every story silently falls back to the system font. `getComputedStyle` on the wrapper itself looks fine; it's `:root` that's broken.
- Without `h-full`/`min-h-full` on the real `<html>`/`<body>`, an isolated story's body box is only as tall as that one component's own content — the background color computes correctly (verify with `getComputedStyle`) but only *paints* that short area, and the rest of the visible canvas shows the browser's own default background instead of the app's, making stories look "unstyled" even though every token resolved correctly.

If a story's background or font ever looks wrong again, check `document.documentElement.className` inside the preview iframe before assuming Tailwind or the design tokens are broken — it's more often this.

## `@source` coverage doesn't include a CSS file's own directory for free

`.storybook/globals.css` imports `apps/web/app/globals.css` and *also* declares `@source "../../web/app";`. That second line looks redundant — `globals.css` already physically lives inside `apps/web/app`, so it seems like Tailwind's automatic content detection should scan that same directory tree — but it doesn't when the CSS is compiled through a *different* app's own separate Tailwind/PostCSS instance (`apps/storybook`'s, not `apps/web`'s). Automatic detection only walks from each `@import`ing CSS file's own project root as that build tool understands it; crossing into another app's source tree always needs an explicit `@source`, even for the literal directory the imported file sits in.

Found via `.text-accent` (used only in `apps/web/app/components/landing/*`, never in `packages/ui`) silently missing from the built CSS — `.bg-primary` had looked fine earlier, but that was a false-negative: it happens to also be used inside `packages/ui`, which *was* already covered by its own `@source`. Verify future CSS-parity checks with a class exclusive to the directory you're trying to confirm, not one that could be covered by an already-working `@source` elsewhere.
