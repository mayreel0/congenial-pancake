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
- `apps/admin` — separate Next.js app for the "신고 검토" moderation screen (`/admin` used to live inside `apps/web`, split out — see `docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md`). Own port (`pnpm --filter admin dev` runs on 3002, not 3000), own minimal login (no signup/OAuth), same backend/session-cookie mechanism as `apps/web` — see `apps/admin/AGENTS.md`.
- `packages/ui` — React components genuinely shared between `apps/web` and `apps/admin` (a confirm dialog, a query provider) — see `packages/ui/AGENTS.md` and `docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md`. Not a general dumping ground: only things identical in both apps with no reason to diverge belong here.
- `packages/api` — shared fetch wrapper + auth calls (`apiFetch`, `login`/`logout`/`fetchCurrentUser`). Can use the plain name `api` because the backend is `apps/api-server`, not `apps/api` — see `packages/api/AGENTS.md`.
- `packages/utils` — shared plain-TS helpers (currently just `formatTimestamp`). Named `utils`, not `util`, to avoid colliding with Node's built-in `util` module — see `packages/utils/AGENTS.md`.
- `apps/storybook-app` — runs Storybook only; owns no components itself. Its `stories` glob scans component-adjacent story files wherever they actually live (`apps/web/app/**/*.stories.tsx`, `packages/ui/src/**/*.stories.tsx`) rather than requiring them to move here — see `apps/storybook-app/AGENTS.md` and `docs/decisions/2026-08-26-onseol-storybook-app-decisions.md`. Directory is `apps/storybook-app` (not `apps/storybook`) to match its own `package.json` name `storybook-app` — that name predates this note and was chosen to avoid a pnpm workspace collision with the real `storybook` npm package (a devDependency here and in `apps/web`/`apps/admin`/`packages/ui` for story-file typechecking).
- `apps/api-server` — Nest.js backend. Run scripts via `pnpm --filter api-server <script>`. See `apps/api-server/AGENTS.md` for Nest-specific conventions (auth, DB, module boundaries). Named `api-server`, not `api`, so `packages/api` (the frontend fetch-client package) could have the more natural short name instead.
