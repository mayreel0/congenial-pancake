// Scenario 2: 비로그인 유저가 IP를 바꿔서 대량 요청 — checked from the other
// direction here: confirms NestJS's ThrottlerGuard actually rejects a
// single source once it exceeds its budget, before worrying about
// rotation bypassing it. Two budgets exist (see apps/api-server/src/
// auth/auth.controller.ts and app.module.ts):
//   - auth endpoints: 5 req/60s
//   - global default: 100 req/60s
// This is a correctness check, not a capacity test — getting 429s is the
// *expected*, passing outcome. A run that never sees a single 429 means
// the throttle isn't actually engaging, which is the real failure mode.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const throttled429 = new Counter('throttled_429_total');

// constant-arrival-rate, not constant-vus with a no-sleep loop — a tight
// loop across even a handful of VUs generates tens of thousands of req/s
// locally (measured: ~14.5k/s with 10 VUs), which just DoSes the box
// instead of testing the throttle. Both budgets trip at a couple of
// requests per second; there's no reason to go faster than that.
export const options = {
  scenarios: {
    auth_throttle: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: 'hitAuthEndpoint',
    },
    global_throttle: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '90s',
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: 'hitPublicEndpoint',
      startTime: '35s',
    },
  },
  thresholds: {
    throttled_429_total: ['count>0'],
  },
};

export function hitAuthEndpoint() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'loadtest-throttle-probe@loadtest.onseol.internal',
      password: 'wrong-password',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status === 429) throttled429.add(1);
  check(res, {
    'expected 401 (bad credentials) or 429 (throttled)': (r) =>
      r.status === 401 || r.status === 429,
  });
}

export function hitPublicEndpoint() {
  const res = http.get(`${BASE_URL}/public/stats`);
  if (res.status === 429) throttled429.add(1);
  check(res, {
    'expected 200 or 429 (throttled)': (r) => r.status === 200 || r.status === 429,
  });
}
