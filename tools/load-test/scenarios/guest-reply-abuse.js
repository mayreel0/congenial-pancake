// Scenario 3: 비로그인 유저가 브라우저/쿠키를 바꿔서 답장 도배 — guest_id is
// a server-trusted cookie with no DB validation (see apps/api-server/src/
// common/middleware/guest-id.middleware.ts), and settings.guestReplyLimit
// is tracked per guest_id, not per IP. So this confirms two things:
//   1. the limit actually blocks the (limit+1)-th reply from the same
//      guest_id
//   2. simply rotating to a new guest_id resets the budget — this is a
//      known, accepted gap (see docs), not something this script is
//      trying to "fix". It's here to keep that gap visible/measured.
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
// Matches settings.guestReplyLimit's schema default (5). Override via
// GUEST_REPLY_LIMIT if the live settings row has been tuned differently.
const GUEST_REPLY_LIMIT = Number(__ENV.GUEST_REPLY_LIMIT || 5);

export const options = {
  scenarios: {
    guest_reply_abuse: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '2m',
    },
  },
};

function setGuestCookie(guestId) {
  http.cookieJar().set(BASE_URL, 'guest_id', guestId);
}

function fetchQueueCandidate(guestId) {
  setGuestCookie(guestId);
  const res = http.get(`${BASE_URL}/requests/queue`);
  check(res, { 'queue 200': (r) => r.status === 200 });
  return res.json();
}

function postReply(requestId, guestId) {
  setGuestCookie(guestId);
  return http.post(
    `${BASE_URL}/requests/${requestId}/replies`,
    JSON.stringify({ body: `[load-test:guest-abuse] ${Date.now()}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

export default function () {
  const guestA = `loadtest-abuse-a-${Date.now()}`;
  const candidate = fetchQueueCandidate(guestA);
  if (!candidate) {
    console.warn(
      'No queue candidate available — reseed with a larger --queue-pool.',
    );
    return;
  }

  for (let i = 0; i < GUEST_REPLY_LIMIT; i++) {
    const res = postReply(candidate.id, guestA);
    check(res, {
      [`reply ${i + 1}/${GUEST_REPLY_LIMIT} succeeds`]: (r) => r.status === 201,
    });
  }

  const overLimitRes = postReply(candidate.id, guestA);
  check(overLimitRes, {
    'reply beyond limit is rejected (409)': (r) => r.status === 409,
  });

  const guestB = `loadtest-abuse-b-${Date.now()}`;
  const rotatedRes = postReply(candidate.id, guestB);
  check(rotatedRes, {
    'new guest_id resets the budget (201)': (r) => r.status === 201,
  });
}
