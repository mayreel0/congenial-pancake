// See docs/decisions/2026-08-22-onseol-answer-queue-decisions.md. Also reused
// by AnswerInteractionsRepository.findHeldForAuthor() so a held request ages
// out of the holder's held list at the same point it ages out of everyone
// else's queue.
export const QUEUE_FRESHNESS_HOURS = 60;
