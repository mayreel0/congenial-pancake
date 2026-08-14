# pnpm minimumReleaseAge blocked official latest boilerplate install

Date: 2026-08-15 KST
Branch: `codex/onseol-next-boilerplate`
Work stage: Next.js boilerplate generation

## Context

The project decided to scaffold the frontend boilerplate with:

- Node.js 22 or newer
- pnpm as the package manager
- Corepack package-manager pinning with `corepack use pnpm@latest-11`
- official-documentation `latest` package resolution for Next.js, React, and Tailwind CSS
- exact resolved versions recorded in `pnpm-lock.yaml`

The working machine was using Node.js `v24.14.0`.

## What happened

`create-next-app` could not scaffold directly into the repository worktree because the directory already contained existing tracked project files:

- `AGENTS.md`
- `README.md`

To preserve the official template output without deleting project files, the template was generated in a temporary lowercase directory and the needed boilerplate files were copied into the worktree.

Successful template generation resolved these notable versions:

- `next@16.3.1`
- `react@19.2.8`
- `react-dom@19.2.8`
- `tailwindcss@4.3.3`
- `@tailwindcss/postcss@4.3.3`
- `eslint-config-next@16.3.1`
- `typescript@5.9.3`

Then `corepack use pnpm@latest-11` installed `pnpm@11.21.0` and attempted to verify/install the lockfile.
The command failed with:

```text
ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
```

pnpm rejected 13 lockfile entries because they were published within the default minimum release age window.

## Root cause

pnpm 11 has a supply-chain protection policy that blocks packages published too recently.
The active policy effectively required packages to be at least 24 hours old.
The official `latest` Next.js resolution selected very recent packages, including:

- `next@16.3.1`, published `2026-08-13T22:34:40Z`
- `eslint-config-next@16.3.1`, published `2026-08-13T22:34:10Z`
- `@next/*@16.3.1` packages, published around `2026-08-13T22:32Z`
- `electron-to-chromium@1.5.406`, published `2026-08-14T02:02:44Z`

At the time of failure, the local time was approximately:

- UTC: `2026-08-14T16:11:26Z`
- KST: `2026-08-15 01:11:26 KST`

The latest offending package was `electron-to-chromium@1.5.406`.
With a 24-hour maturity window, it should become mature at:

- UTC: `2026-08-15T02:02:44Z`
- KST: `2026-08-15 11:02:44 KST`

Approximate wait from the observed time: 9 hours 51 minutes.

## Decision options

### Option A: Wait until packages mature

Recommended default.

This preserves both project decisions:

- use official `latest` resolution
- keep pnpm 11 supply-chain protection intact

Expected next retry time:

- after `2026-08-15 11:03 KST`

Risk:

- A later retry could resolve an even newer transitive package if registry metadata changes.
- If that happens, repeat the same maturity check using the newest offending publish timestamp.

### Option B: Add `minimumReleaseAgeExclude`

This would allow the affected package names or versions to bypass the maturity window.

Possible entries would include packages such as:

- `next`
- `eslint-config-next`
- `@next/*`
- `electron-to-chromium`

Risk:

- It weakens the supply-chain protection that pnpm 11 is providing.
- It introduces an exception list before the first boilerplate PR, which is more policy than product work.

### Option C: Use older mature versions

This would avoid waiting, but it conflicts with the current "official docs latest resolution" decision unless the user explicitly changes that decision.

Risk:

- Adds version-selection judgment before the project has any app code.
- Future updates may be needed immediately.

## Current recommendation

Wait until after `2026-08-15 11:03 KST` and rerun the pnpm install/verification flow.
If it still fails, inspect the new offending publish timestamps before changing policy.

## Commands involved

Successful temporary scaffold command:

```bash
pnpm create next-app@latest /private/tmp/onseol-next-template-sip2qa --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm
```

Failed command:

```bash
corepack use pnpm@latest-11
```

Follow-up diagnostics:

```bash
node --version
corepack --version
pnpm config list
date -u '+%Y-%m-%dT%H:%M:%SZ'
date '+%Y-%m-%d %H:%M:%S %Z'
```

## Process lesson

When combining "official latest" dependency resolution with pnpm 11, dependency freshness can block installs even when the selected versions are legitimate official releases.
For future boilerplate work, check pnpm's release-age policy before assuming that `latest` can be installed immediately.
