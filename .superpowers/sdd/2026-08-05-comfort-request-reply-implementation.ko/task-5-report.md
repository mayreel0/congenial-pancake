# Task 5 Report: Comfort MVP Main UI

## Status

Complete. The home route now renders the Comfort MVP with today's request state, recent public comfort examples, a request form, and a single-textarea answer flow. Legacy `/posts`, `/posts/new`, `/posts/[postId]`, and `/rankings` routes redirect to `/`.

## Commits

- `feat: replace praise home with comfort mvp` (this Task 5 commit)

## Files Changed

- `src/app/page.tsx`: loads the Task 3 comfort helpers and renders `ComfortMain`.
- `src/components/ComfortMain.tsx`: coordinates status, examples, request/reply tabs, and child UI.
- `src/components/ComfortRequestForm.tsx`: submits anonymous comfort requests to `/api/comfort/requests`.
- `src/components/ComfortReplyPanel.tsx`: selects a request and submits one anonymous reply textarea to `/api/comfort/requests/:requestId/replies`.
- `src/components/RecentComfortExamples.tsx`: renders recent visible requests and replies.
- `src/app/posts/page.tsx`, `src/app/posts/new/page.tsx`, `src/app/posts/[postId]/page.tsx`, `src/app/rankings/page.tsx`: redirect legacy praise routes to `/`.
- `src/app/globals.css`: adds compact layout and state styling for the Comfort MVP.
- `src/components/__tests__/ComfortMain.test.tsx`: adds the required component smoke test.
- `vitest.config.ts`: includes `.tsx` tests under `src/**/__tests__` so the required smoke test is discoverable.

## Tests Run

- `npm run test -- src/components/__tests__/ComfortMain.test.tsx` - passed: 1 test file, 1 test.
- `npx eslint src/app/page.tsx src/app/posts/page.tsx src/app/posts/new/page.tsx src/app/posts/'[postId]'/page.tsx src/app/rankings/page.tsx src/components/ComfortMain.tsx src/components/ComfortRequestForm.tsx src/components/ComfortReplyPanel.tsx src/components/RecentComfortExamples.tsx src/components/__tests__/ComfortMain.test.tsx vitest.config.ts` - passed with no output.
- `git diff --check` - passed with no output.

## TDD Evidence

1. Added `ComfortMain.test.tsx` before production component code.
2. The first run could not discover the prescribed `.tsx` test because Vitest only included `src/**/__tests__/**/*.test.ts`; after the narrow test-discovery fix, the same test failed because `@/components/ComfortMain` did not exist.
3. Added the Comfort MVP components and reran the unchanged test successfully.

## Concerns

- Branch-wide `npm run verify` was intentionally not run, per Task 5 instructions. It is expected to remain affected by later-task praise-domain cleanup and old tests.
- `src/components/PraiseRoom.tsx` remains as an unused legacy component so existing old-domain tests are not independently broken; requested legacy page routes now redirect and no active route imports it.
