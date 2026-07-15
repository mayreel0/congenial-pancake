# AI Usage Controls Design

## Purpose

AI praise generation needs a cost guardrail before the service grows. The MVP should let moderators turn AI praise on or off from the app, cap daily AI work, and record enough usage information to understand why jobs ran or skipped.

This design keeps the first version operationally useful without adding billing integration, exact token accounting, or external analytics.

## Scope

Included:

- A database-backed AI control setting.
- Daily job and generated-comment limits.
- AI usage event records for runs, skips, and failures.
- Moderator controls inside the existing moderation area.
- Worker enforcement before provider calls are made.
- Unit tests for policy decisions and API validation.

Excluded for this PR:

- Exact provider billing reconciliation.
- Per-user paid quotas.
- Provider-side budget alert integration.
- A separate admin dashboard app.

## Data Model

Add an `AiControlSetting` model with a singleton row keyed by a stable id such as `global`.

Fields:

- `id`: string primary key, default controlled by code.
- `enabled`: boolean, default `true`.
- `dailyJobLimit`: integer, default `100`.
- `dailyCommentLimit`: integer, default `300`.
- `createdAt`, `updatedAt`.

Add an `AiUsageEvent` model.

Fields:

- `id`: string primary key.
- `jobId`: optional AI job id.
- `postId`: optional post id.
- `provider`: string, for example `gemini` or `openai`.
- `model`: string.
- `status`: string status: `RUN`, `SKIPPED`, or `FAILED`.
- `reason`: stable reason such as `disabled`, `daily_job_limit`, `daily_comment_limit`, `completed`, or `provider_error`.
- `requestedComments`: integer.
- `generatedComments`: integer.
- `estimatedPromptTokens`: integer, approximate.
- `estimatedResponseTokens`: integer, approximate.
- `createdAt`.

Token counts are estimates based on text length. They are for operational awareness, not billing-grade accounting.

## Server Policy

Create an `src/server/ai-controls.ts` module that owns the policy boundary.

Responsibilities:

- Read or create the singleton setting.
- Calculate the current UTC day window.
- Count today's AI usage events.
- Decide whether an AI job may run.
- Record usage events after skip, success, or failure.
- Estimate prompt and response token usage.

The worker flow becomes:

1. Load the AI job and post.
2. Mark the job `RUNNING` only after terminal-state checks.
3. Ask `canRunAiPraiseJob()` whether the job can call the provider.
4. If disabled or over limit, mark the job `SKIPPED` and record `AiUsageEvent`.
5. If allowed, call Gemini/OpenAI.
6. Create comments within the existing per-post cap.
7. Record generated count and rough token estimates.
8. If provider generation throws, mark the job `FAILED`, record a failure event, and rethrow for BullMQ retry behavior.

Daily comment limit should be enforced before the provider call using requested comment count. After creation, the usage event records the actual generated count.

## Moderator UI and API

Reuse the existing `/moderation` area.

Add a compact AI control section that shows:

- Current AI enabled state.
- Daily job limit input.
- Daily comment limit input.
- Today's job count.
- Today's generated AI comment count.
- Today's skipped and failed count.

Add a moderator-only API route, or extend the existing moderation API with a clearly separated action, to update settings.

Validation:

- Only moderators can read or update AI controls.
- Limits must be integers from 0 to 10000.
- `enabled` must be boolean.
- A limit of 0 means no jobs/comments for that day.

## Error Handling

- Missing settings row is created with defaults.
- AI disabled or over quota is not an error; jobs become `SKIPPED`.
- Provider failures become `FAILED` usage events and preserve normal worker retry behavior.
- The UI should show current settings and today's usage even if no events exist yet.

## Tests

Add unit tests for:

- Default AI controls are enabled with conservative limits.
- Disabled AI skips before provider calls.
- Daily job limit skips once today's run count reaches the limit.
- Daily comment limit skips when requested comments would exceed the limit.
- Usage events record success, skip, and failure reasons.
- Moderator API rejects non-moderators and invalid limits.

Keep existing job tests passing.

## Success Criteria

- A moderator can turn AI generation off from the app.
- A moderator can set daily job and comment limits.
- AI jobs do not call Gemini/OpenAI when disabled or over daily limits.
- Operators can see today's AI usage from the moderation page.
- The system remains switchable between Gemini and OpenAI.
