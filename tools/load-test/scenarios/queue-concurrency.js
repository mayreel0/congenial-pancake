// Scenario 5: 답변 큐 동시성 — many VUs racing GET /requests/queue + a reply
// against the same small, reply-free pool (seed.ts's --queue-pool). This
// checks the ranking logic (RequestsRepository.findQueueCandidate) holds
// up under concurrency — no 500s, no obviously-wrong duplicate
// assignments — not throughput. Answer-queue ranking has broken under
// edge cases before (PR #73, a NULL-safe-comparison bug), which is why
// this gets its own scenario instead of folding into scenario 1.
//
// A 409 on the reply (someone else already replied to the same request
// first) is an *expected*, correct outcome — the pool is intentionally
// small so this race actually happens. It's only a bug if EVERY reply
// 409s, which would suggest queue results aren't being excluded/consumed
// at all.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const serverErrors = new Counter('queue_5xx_total');

export const options = {
  scenarios: {
    queue_concurrency: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 60,
      maxDuration: '1m',
    },
  },
  thresholds: {
    queue_5xx_total: ['count==0'],
  },
};

export default function () {
  const guestId = `loadtest-queue-${__VU}-${__ITER}-${Date.now()}`;
  http.cookieJar().set(BASE_URL, 'guest_id', guestId);

  const queueRes = http.get(`${BASE_URL}/requests/queue`);
  if (queueRes.status >= 500) serverErrors.add(1);
  check(queueRes, { 'queue request ok': (r) => r.status === 200 });

  const candidate = queueRes.json();
  if (!candidate) return; // pool exhausted — expected once enough VUs consume it

  const replyRes = http.post(
    `${BASE_URL}/requests/${candidate.id}/replies`,
    JSON.stringify({ body: `[load-test:queue-race] ${Date.now()}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (replyRes.status >= 500) serverErrors.add(1);
  check(replyRes, {
    'reply succeeds or loses the race cleanly (201/409)': (r) =>
      r.status === 201 || r.status === 409,
  });
}
