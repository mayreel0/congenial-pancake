<!-- project-wiki-mode:start -->
# Agent Instructions

## Project Wiki Mode

When the user says "위키 모드", "Project Wiki Mode", or asks to work on this project with wiki documentation, follow these rules.

### Work Root

Do actual implementation, debugging, testing, and command execution in this repository, meaning the directory that contains this `AGENTS.md` file.

Do not create project wiki documents inside this repository unless the user explicitly asks.

### Required Environment

Before writing wiki documents, confirm that this environment variable is set:

`OBSIDIAN_VAULT_DIR`

It must point to the local Obsidian Vault root. If it is missing, ask the user for the vault location before writing wiki documents.

### Wiki Root

Store project wiki documents in the Obsidian Vault:

`${OBSIDIAN_VAULT_DIR}/10-Projects/congenial-pancake`

If the folder does not exist, create it.

### Shared Rules

Follow the shared Project Wiki Mode rules:

`${OBSIDIAN_VAULT_DIR}/10-Projects/LLM Markdown Wiki System/08 Project Wiki Mode.md`

### During Work

- Solve the user's actual task first.
- Record important decisions and failures in `90 Logs/`.
- Promote stable setup and operation commands to `03 Operations Runbook.md`.
- Promote failures and fixes to `04 Troubleshooting.md`.
- Promote reusable concepts to `05 Knowledge Map.md`.
- Do not spend excessive time polishing wiki docs during active implementation.

### After Work

Before calling the task complete, update the project wiki with:

- What changed
- How it was verified
- Important decisions
- New operations commands
- Troubleshooting notes
- Reusable knowledge

### Public Documents

Only add this frontmatter to documents that are safe to publish:

```md
---
visibility: public
---
```

Never include real sensitive values in public documents.

Do not expose real domains, internal IPs, usernames, hostnames, SSH ports, Device IDs, tokens, cookies, API keys, private repository URLs, local home paths, or raw secrets.

Use placeholders such as `example.com`, `192.0.2.10`, `user`, `/path/to/project`, and `private repository`.

### If Unsure

If unsure where to store wiki documents, ask before writing.

Do not default to writing wiki documents into the current repository.
<!-- project-wiki-mode:end -->

## Project Decision Rules

Before making a product, UX, technical stack, backend, infrastructure, deployment, moderation, or workflow decision, present the recommended choice with rationale and ask the user to confirm.
Do not silently finalize meaningful tradeoffs.

Record each confirmed decision as its own file in `docs/decisions/`, named `YYYY-MM-DD-onseol-<topic>-decisions.md` (one file per decision session, real calendar date). Follow the shape already used by every existing file in that folder: 배경(context) → the decision(s) with rationale ("근거") → 산출물(what was actually built) → 검증(how it was verified) → 남은 일(what's left/deferred). Check `docs/decisions/` before proposing a design that touches auth, DB schema, moderation, or anonymous/guest access — several of these are already decided and documented; re-deciding from scratch risks contradicting a real prior decision instead of building on it. This is the default even outside Project Wiki Mode — Project Wiki Mode (above) is for promoting this into an Obsidian vault, not a substitute for it.

## Git & PR Conventions

- Never push directly to `main` or `v1` — every change goes through a work branch and a PR. This is enforced, not just prose: `.claude/hooks/block-main-push.py` (registered in `.claude/settings.json`) blocks a `git push` targeting either branch, explicit or implicit.
- Commit messages and PR titles both use a `<type>: <설명>` prefix (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, ...), and the two must match for the same change. Before writing either, check the existing convention rather than assuming — `git log --oneline -10` for commit style, `gh pr list --state all --limit 10` for PR title style. Do not title a PR without doing this check, even if the commit message already has a prefix. PR titles are also checked by CI (`.github/workflows/pr-title.yml`) before merge.
- Prefer several small, single-concern PRs over one large bundled one. This repo's history deliberately splits backend and frontend for the same feature into separate rounds — default to proposing that split rather than bundling.

## Verification Standard

Passing lint/typecheck/tests is necessary but not sufficient before calling a change done. Verify backend changes against a real local server with `curl` (not just unit tests); verify frontend changes by clicking through them in a real browser against a live dev server. This has been the bar for every round in this project so far — treat it as a requirement, not an optional extra.

## Local Dev Server Hygiene

If you start a background dev server (`pnpm --filter <app> dev` / `start:dev`) to verify a change, stop it yourself once verification is done — don't leave it running for the user to find and kill later. Ports that recur in this project: `apps/web` 3000, `apps/api-server` 8080, `apps/admin` 3002, `apps/storybook-app` 6006, `apps/api-server`'s Swagger-only process 8081.

## Knowledge Capture Purpose

The applied `effective-doodle` system is the project's LLM wiki workflow.
The working agent does not need to run wiki mode unless the user explicitly asks.
Do not add wiki-writing tasks to product or implementation plans unless the user explicitly requests them.
As work progresses, keep detailed records of important concepts, decisions, alternatives considered, rationale, implementation process, mistakes, fixes, verification results, unresolved questions, commits, and PR links so a separate wiki agent can promote them without losing context.
When `OBSIDIAN_VAULT_DIR` is available and wiki writing is requested, store those notes in the configured Obsidian Vault project folder, not in this repository.

## Review-Time Knowledge Capture

When the user says "위키에 쓸 수 있게", "기록해줘", "정리해줘", or similar during an active PR review, do not interpret that as permission to create Obsidian wiki pages or to open a new PR.

Instead:

- Record the note in the relevant in-repository work log, decision document, or review note so a separate wiki agent can promote it later.
- Keep review-time notes batched with the active PR branch unless the user explicitly asks for a separate branch or PR.
- Do not commit or push every small note immediately while the user is still reviewing. Accumulate the notes, then commit/push them when the user asks to include them in the PR or says the review batch is ready.
- If the user explicitly says to include a note in the current PR, add it to the current PR branch and push that branch, not a new branch.
- If `OBSIDIAN_VAULT_DIR` is missing, do not ask for the Vault path unless the user explicitly requests Project Wiki Mode or direct wiki writing.

## Workspace Layout

This is a pnpm workspace (`packages: apps/*`, `packages/*`). Each app/package keeps its own `AGENTS.md`/`CLAUDE.md` for app-specific, tool-specific notes; this root file stays scoped to project-wide rules (branching, decision process, wiki mode). When working inside an app, its own `AGENTS.md` applies in addition to this one.

- `apps/web` — Next.js frontend, the public site (`/today`, `/answer`, `/read`, `/me`). Run scripts via `pnpm --filter web <script>` from the repo root, or `cd apps/web` first. `apps/web/AGENTS.md` is written and re-added by `next dev` itself (Next.js's own agent-rules block, not authored by us) — do not remove it or treat it as stale; it regenerates on the next `next dev` run if deleted. `apps/web/CLAUDE.md` just imports it (`@AGENTS.md`).
- `apps/admin` — separate Next.js app for admin screens ("신고 검토" moderation, "설정" DB-backed tunable limits — `/admin` used to live inside `apps/web`, split out — see `docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md`). Own port (`pnpm --filter admin dev` runs on 3002, not 3000), own minimal login (no signup/OAuth), same backend/session-cookie mechanism as `apps/web` — see `apps/admin/AGENTS.md`.
- `packages/ui` — React components genuinely shared between `apps/web` and `apps/admin` (a confirm dialog, a query provider, a primary button, a labeled text field) — see `packages/ui/AGENTS.md` and `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md`. Not a general dumping ground: only things identical in both apps with no reason to diverge belong here.
- `packages/api` — shared fetch wrapper + auth calls (`apiFetch`, `login`/`logout`/`fetchCurrentUser`). Can use the plain name `api` because the backend is `apps/api-server`, not `apps/api` — see `packages/api/AGENTS.md`.
- `packages/utils` — shared plain-TS helpers (currently just `formatTimestamp`). Named `utils`, not `util`, to avoid colliding with Node's built-in `util` module — see `packages/utils/AGENTS.md`.
- `packages/shared` — plain-TS helpers shared across the frontend/backend boundary specifically (`apps/web` **and** `apps/api-server`, unlike `packages/ui`/`api`/`utils` which only ever cross `apps/web`/`apps/admin`) — currently pagination envelope/parsing and the KST date-string subset genuinely identical on both sides. Works with no build step the same way the other `packages/*` do, but relies on Node's native TypeScript stripping (not a bundler) for `apps/api-server` to consume it — see `packages/shared/AGENTS.md` for the constraint that follows from that (erasable syntax only) and `docs/decisions/2026-09-01-onseol-shared-package-spike-decisions.md`.
- `apps/storybook-app` — runs Storybook only; owns no components itself. Its `stories` glob scans component-adjacent story files wherever they actually live (`apps/web/app/**/*.stories.tsx`, `packages/ui/src/**/*.stories.tsx`) rather than requiring them to move here — see `apps/storybook-app/AGENTS.md` and `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md`. Directory is `apps/storybook-app` (not `apps/storybook`) to match its own `package.json` name `storybook-app` — that name predates this note and was chosen to avoid a pnpm workspace collision with the real `storybook` npm package (a devDependency here and in `apps/web`/`apps/admin`/`packages/ui` for story-file typechecking).
- `apps/api-server` — Nest.js backend. Run scripts via `pnpm --filter api-server <script>`. See `apps/api-server/AGENTS.md` for Nest-specific conventions (auth, DB, module boundaries). Named `api-server`, not `api`, so `packages/api` (the frontend fetch-client package) could have the more natural short name instead.
