# packages/ui — shared code between apps/web and apps/admin

Project-wide rules live in the root `AGENTS.md`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for the full reasoning behind this package's existence and what belongs here vs. not.

## What belongs here — React components only

Only genuinely React-specific code (components, providers) that is identical between `apps/web` and `apps/admin` today, with no reason to expect it to diverge — not "similar," not "could plausibly be shared with effort." If sharing something here would require adding options/flags to accommodate one app's extra needs (the way `apps/web`'s auth flow needs signup/Google OAuth and `apps/admin`'s doesn't), it belongs in that app instead, not here.

Plain TS/data-fetching logic does **not** belong here even if it's shared and React-adjacent — that's what `packages/api-client` (fetch wrapper, auth calls) and `packages/utils` (formatting helpers) are for. This package used to hold `api.ts`/`format.ts` too; they were split out once someone pointed out that a package named "ui" containing a non-React fetch client was misleading. Before adding a new file here, ask: does it render anything / use React? If not, it probably belongs in `packages/api-client` or `packages/utils` instead.

## No build step

`package.json`'s `exports` field maps each subpath (`"./ActionConfirmDialog"`, `"./QueryProvider"`) directly to a `.tsx` file under `src/` — there's no `tsc` build producing `dist/`. Consuming apps compile this package's source as part of their own build via Next's `transpilePackages: ["ui"]` config. This means:

- Adding a new file here requires adding its subpath to `package.json`'s `exports` map, or it won't be importable from either app.
- `pnpm --filter ui typecheck` type-checks this package standalone; each consuming app's own `typecheck` also transitively checks whatever it actually imports from here.

`packages/api-client` and `packages/utils` follow the exact same source-only/`transpilePackages` pattern — see their own `AGENTS.md` files for what's specific to each (`api-client`'s `NEXT_PUBLIC_API_BASE_URL` per-app inlining, in particular).

## Tailwind consumers must opt in

Any React component here that uses Tailwind utility classes only generates real CSS in a consuming app if that app's `globals.css` has `@source "../../../packages/ui/src";` — Tailwind v4's automatic content-detection doesn't cross into directories outside the CSS file's own tree. Both `apps/web` and `apps/admin` already have this. If you add classes here that never show up styled in a consuming app, check that line exists and points at the right path before debugging anything else — and if the consumer is `apps/storybook-app`, also check it actually has a `postcss.config.mjs` + `tailwindcss`/`@tailwindcss/postcss` of its own (it doesn't inherit any app's config just by importing that app's CSS file — this bit us once, see `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md`).

## Story files live here too

A component with a Storybook story keeps that story right next to it (e.g. `ActionConfirmDialog.tsx` + `ActionConfirmDialog.stories.tsx`), not inside `apps/web` or `apps/storybook-app` — `apps/storybook-app`'s config just discovers this directory via glob. `pnpm --filter ui lint` covers `.stories.tsx` files here (via `eslint-plugin-storybook`); `pnpm --filter ui typecheck` needs `@storybook/nextjs-vite`/`storybook` present as devDependencies purely for their types, even though this package never runs Storybook itself.
