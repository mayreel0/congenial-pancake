// Scenario 4: 비로그인 읽기 트래픽 — the most common real traffic shape
// (just browsing, no posting). No auth/guest setup needed at all; k6
// maintains one cookie jar per VU automatically, same as a real anonymous
// browser session picking up the server-issued guest_id cookie.
//
// Every VU here runs from one real source IP (this machine), which the
// app's global ThrottlerGuard caps at 100 req/60s regardless of how many
// VUs k6 spins up — measured: without a bypass, ~92% of requests just get
// 429'd, which only re-tests scenario 2's throttle, not real capacity. Set
// LOAD_TEST_BYPASS_TOKEN to the same value as apps/api-server/.env's
// LOAD_TEST_BYPASS_TOKEN to actually exercise the app/DB at these volumes
// — see tools/load-test/README.md and apps/api-server/src/app.module.ts.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const LOAD_TEST_BYPASS_TOKEN = __ENV.LOAD_TEST_BYPASS_TOKEN || '';

function requestParams() {
  return LOAD_TEST_BYPASS_TOKEN
    ? { headers: { 'x-load-test-bypass': LOAD_TEST_BYPASS_TOKEN } }
    : {};
}

export const options = {
  scenarios: {
    anonymous_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 150 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const roll = Math.random();
  const params = requestParams();
  let res;
  if (roll < 0.5) {
    res = http.get(`${BASE_URL}/requests/feed`, params);
  } else if (roll < 0.75) {
    res = http.get(`${BASE_URL}/public/stats`, params);
  } else if (roll < 0.9) {
    res = http.get(`${BASE_URL}/public/samples?limit=6`, params);
  } else {
    res = http.get(`${BASE_URL}/requests/feed/counts`, params);
  }
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
