# packages/ui — shared code between apps/web and apps/admin

Project-wide rules live in the root `AGENTS.md`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for the full reasoning behind this package's existence and what belongs here vs. not.

## What belongs here

Only code that is genuinely identical between `apps/web` and `apps/admin` today, with no reason to expect it to diverge — not "similar," not "could plausibly be shared with effort." If sharing something here would require adding options/flags to accommodate one app's extra needs (the way `apps/web`'s auth flow needs signup/Google OAuth and `apps/admin`'s doesn't), it belongs in that app instead, not here.

## No build step

`package.json`'s `exports` field maps each subpath (`"./api"`, `"./ActionConfirmDialog"`, etc.) directly to a `.ts`/`.tsx` file under `src/` — there's no `tsc` build producing `dist/`. Consuming apps compile this package's source as part of their own build via Next's `transpilePackages: ["ui"]` config. This means:

- `NEXT_PUBLIC_*` env vars referenced in this package's source (e.g. `api.ts`'s `API_BASE_URL`) get inlined per-consuming-app at that app's build time — the same source file legitimately resolves to a different value in `apps/web` vs `apps/admin`. Don't "fix" this by hardcoding or parameterizing it.
- Adding a new file here requires adding its subpath to `package.json`'s `exports` map, or it won't be importable from either app.
- `pnpm --filter ui typecheck` type-checks this package standalone; each consuming app's own `typecheck` also transitively checks whatever it actually imports from here.

## Tailwind consumers must opt in

Any React component here that uses Tailwind utility classes only generates real CSS in a consuming app if that app's `globals.css` has `@source "../../../packages/ui/src";` — Tailwind v4's automatic content-detection doesn't cross into directories outside the CSS file's own tree. Both `apps/web` and `apps/admin` already have this. If you add classes here that never show up styled in a consuming app, check that line exists and points at the right path before debugging anything else — and if the consumer is `apps/storybook`, also check it actually has a `postcss.config.mjs` + `tailwindcss`/`@tailwindcss/postcss` of its own (it doesn't inherit any app's config just by importing that app's CSS file — this bit us once, see `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md`).

## Story files live here too

A component with a Storybook story keeps that story right next to it (e.g. `ActionConfirmDialog.tsx` + `ActionConfirmDialog.stories.tsx`), not inside `apps/web` or `apps/storybook` — `apps/storybook`'s config just discovers this directory via glob. `pnpm --filter ui lint` covers `.stories.tsx` files here (via `eslint-plugin-storybook`); `pnpm --filter ui typecheck` needs `@storybook/nextjs-vite`/`storybook` present as devDependencies purely for their types, even though this package never runs Storybook itself.
