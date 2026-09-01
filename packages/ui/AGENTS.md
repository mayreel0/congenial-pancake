# packages/ui — shared code between apps/web and apps/admin

Project-wide rules live in the root `AGENTS.md`. See `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md` for the full reasoning behind this package's existence and what belongs here vs. not.

## What belongs here — React components only

Only genuinely React-specific code (components, providers) that is identical between `apps/web` and `apps/admin` today, with no reason to expect it to diverge — not "similar," not "could plausibly be shared with effort." If sharing something here would require adding options/flags to accommodate one app's extra needs (the way `apps/web`'s auth flow needs signup/Google OAuth and `apps/admin`'s doesn't), it belongs in that app instead, not here.

Plain TS/data-fetching logic does **not** belong here even if it's shared and React-adjacent — that's what `packages/api` (fetch wrapper, auth calls) and `packages/utils` (formatting helpers) are for. This package used to hold `api.ts`/`format.ts` too; they were split out once someone pointed out that a package named "ui" containing a non-React fetch client was misleading. Before adding a new file here, ask: does it render anything / use React? If not, it probably belongs in `packages/api` or `packages/utils` instead.

## No build step

`package.json`'s `exports` field maps each subpath (`"./ActionConfirmDialog"`, `"./QueryProvider"`, `"./Button"`, `"./TextField"`, `"./Toggle"`) directly to a `.tsx` file under `src/` — there's no `tsc` build producing `dist/`. Consuming apps compile this package's source as part of their own build via Next's `transpilePackages: ["ui", "api", "utils"]` config. This means:

- Adding a new file here requires adding its subpath to `package.json`'s `exports` map, or it won't be importable from either app.
- `pnpm --filter ui typecheck` type-checks this package standalone; each consuming app's own `typecheck` also transitively checks whatever it actually imports from here.

`packages/api` and `packages/utils` follow the exact same source-only/`transpilePackages` pattern — see their own `AGENTS.md` files for what's specific to each (`api`'s `NEXT_PUBLIC_API_BASE_URL` per-app inlining, in particular).

## `Button` is the one component here that needs `next`

`Button` (`src/Button.tsx`) renders a Next `<Link>` when given an `href` prop, `<button>` otherwise — both need the exact same visual style at several call sites (a CTA that happens to navigate vs. one that submits a form). This is the only file in this package that imports `next/*`, so `next` is now a peerDependency/devDependency here too. `variant: "primary" | "secondary"` (added 2026-08-29 once a second real need — a cancel action next to a primary submit — showed up; see `docs/decisions/2026-08-29-onseol-nickname-cooldown-decisions.md`) — still don't add further variants (`outline`/`ghost`/etc.) speculatively, only add one once it's actually duplicated somewhere, same reasoning as before (`docs/decisions/2026-08-26-onseol-refactoring-pass-decisions.md`).

`TextField` (`src/TextField.tsx`) ties its label weight to whether a `hint` is passed (bold+foreground with a hint, muted without) rather than a separate prop, and takes `width: "full" | "compact"` instead of a free-form `className` override — this repo has no `tailwind-merge`/`clsx`, so two conflicting width utility classes on the same element would have undefined precedence. Same decision doc has the full reasoning. The `<label>` is explicitly `block` — without it, a short label next to a narrow (`compact`) input with no `hint` sits inline beside the input instead of stacking above it, since nothing else forces a line break (a `hint`'s `<p>` or a `full`-width input happens to force one, which is why this went unnoticed until a `compact`+no-`hint` field — `NicknameSection`'s edit form — actually shipped). `TextField.stories.tsx`'s `CompactNoHint` story covers this combination now.

`Toggle` (`src/Toggle.tsx`) is a real `<input type="checkbox" role="switch">` under `sr-only`, visually styled as a switch via Tailwind's `peer`/`peer-checked:` variants on two sibling `<span>`s (track + thumb) — not a styled `<button role="switch">`. Picked so existing "wrap it in a `<label>`" call sites barely change, and native keyboard/focus/label semantics come for free. Controlled component (`checked`/`onChange(checked)`), `label` is visible by default next to the switch (`labelHidden` for screen-reader-only). Reach for this anywhere a boolean setting needs a switch UI instead of styling a one-off checkbox.

## `useDismissOnOutsideClick` / `MoreMenu`

`useDismissOnOutsideClick(active, onDismiss)` (`src/useDismissOnOutsideClick.ts`) is a behavior-only hook — it owns a ref and a `mousedown`-outside-of-ref listener, active only while `active` is true, and calls `onDismiss()` when triggered. Attach the returned ref to whichever element should count as "inside" (a dropdown's trigger+panel wrapper, a modal's content box). Extracted 2026-09-01 once the same effect showed up byte-for-byte four times (three report/hold dropdown menus plus `ServiceNav`'s profile menu) — see `docs/decisions/2026-09-01-onseol-dismiss-on-outside-click-decisions.md`. `ActionConfirmDialog` also uses it (ref on the inner box, `onDismiss` wired to `onCancel`), so clicking the backdrop now cancels too, not just the two buttons — see `docs/decisions/2026-09-01-onseol-action-confirm-dialog-backdrop-decisions.md`.

`MoreMenu` (`src/MoreMenu.tsx`) is the "더보기" kebab-button + dropdown pattern specifically — `ariaLabel` (the panel's `aria-label`) and `items: {key, icon, label, onClick}[]`. Only reach for this when the trigger button and panel markup would otherwise be copy-pasted verbatim (as they were across `RequestBubble`/`ReadRequestBubble`/`ReadReplyBubble`) — a dropdown with meaningfully different structure (e.g. `ServiceNav`'s profile menu, which has an email header and account links, not a flat icon+label action list) should use the hook directly instead of forcing itself into this shape.

## Tailwind consumers must opt in

Any React component here that uses Tailwind utility classes only generates real CSS in a consuming app if that app's `globals.css` has `@source "../../../packages/ui/src";` — Tailwind v4's automatic content-detection doesn't cross into directories outside the CSS file's own tree. Both `apps/web` and `apps/admin` already have this. If you add classes here that never show up styled in a consuming app, check that line exists and points at the right path before debugging anything else — and if the consumer is `apps/storybook-app`, also check it actually has a `postcss.config.mjs` + `tailwindcss`/`@tailwindcss/postcss` of its own (it doesn't inherit any app's config just by importing that app's CSS file — this bit us once, see `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md`).

## Story files live here too

A component with a Storybook story keeps that story right next to it (e.g. `ActionConfirmDialog.tsx` + `ActionConfirmDialog.stories.tsx`), not inside `apps/web` or `apps/storybook-app` — `apps/storybook-app`'s config just discovers this directory via glob. `pnpm --filter ui lint` covers `.stories.tsx` files here (via `eslint-plugin-storybook`); `pnpm --filter ui typecheck` needs `@storybook/nextjs-vite`/`storybook` present as devDependencies purely for their types, even though this package never runs Storybook itself.
