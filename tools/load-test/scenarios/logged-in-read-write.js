// Scenario 1: 로그인 유저가 실사용 엔드포인트에 수많은 요청을 보내는 경우.
// Ramps concurrent "logged in" VUs and measures how the read/write path
// holds up — this is the "얼마나 버틸 수 있나" (capacity) style test.
//
// Every VU here runs from one real source IP (this machine), which the
// app's global ThrottlerGuard caps at 100 req/60s regardless of how many
// VUs k6 spins up — measured: without a bypass, ~93% of requests just get
// 429'd, which only re-tests scenario 2's throttle, not real capacity. Set
// LOAD_TEST_BYPASS_TOKEN to the same value as apps/api-server/.env's
// LOAD_TEST_BYPASS_TOKEN to actually exercise the app/DB at these volumes
// — see tools/load-test/README.md and apps/api-server/src/app.module.ts.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const LOAD_TEST_BYPASS_TOKEN = __ENV.LOAD_TEST_BYPASS_TOKEN || '';

// Session tokens minted by ../seed.ts, straight into the sessions table —
// bypasses /auth/login (and its 5 req/60s throttle) entirely.
const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open('../.output/tokens.json'));
});

export const options = {
  scenarios: {
    logged_in_read_write: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
  },
};

function authHeaders() {
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const headers = { Authorization: `Bearer ${token}` };
  if (LOAD_TEST_BYPASS_TOKEN) headers['x-load-test-bypass'] = LOAD_TEST_BYPASS_TOKEN;
  return headers;
}

export default function () {
  const roll = Math.random();
  if (roll < 0.7) {
    const res = http.get(`${BASE_URL}/requests/feed`, { headers: authHeaders() });
    check(res, { 'feed 200': (r) => r.status === 200 });
  } else if (roll < 0.9) {
    // No cap on member POST /requests (only guests are capped), so this is
    // safe to repeat every iteration without accumulating 409s.
    const body = JSON.stringify({
      body: `[load-test:write] 부하테스트 요청 ${Date.now()}-${__VU}-${__ITER}`,
    });
    const res = http.post(`${BASE_URL}/requests`, body, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    check(res, { 'create request 201': (r) => r.status === 201 });
  } else {
    const res = http.get(`${BASE_URL}/requests/mine`, { headers: authHeaders() });
    check(res, { 'mine 200': (r) => r.status === 200 });
  }
  sleep(1);
}
