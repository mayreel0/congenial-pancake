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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
