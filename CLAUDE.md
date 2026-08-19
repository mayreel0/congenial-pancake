# CLAUDE.md

This project's working rules live in `AGENTS.md` at the repo root. Read it and follow it before making changes.

Quick reference (see `AGENTS.md` for the full, authoritative version):

- Do not push directly to `main` or `v1`. All changes go through a work branch and a PR.
- Product, UX, technical-stack, backend, infra, deploy, moderation, and workflow decisions with a meaningful tradeoff need a recommendation plus explicit user confirmation before being finalized. Do not silently decide.
- Wiki-mode documentation (Obsidian vault writes) only applies when the user explicitly asks for it; otherwise keep decisions, context, and verification notes in this repo's `docs/` tree so they can be promoted later.

## Local environment

This repo pins Node 24.14.0 via `.nvmrc`. If the shell's default `node` differs, `pnpm` fails immediately with `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`. Run `nvm use` (or otherwise select Node 24.14.0) before running `pnpm` commands.
