# tools/load-test — apps/api-server 부하테스트

`docs/decisions/`의 관례를 아직 안 따르는 순수 도구 디렉토리. 결정 배경은
`docs/decisions/2026-09-04-onseol-load-test-scope-decisions.md` 참고.

## 대상 환경

**절대 실제 프로덕션(`api.onseol.com`)에 직접 부하를 걸지 말 것.** EC2
t3.micro / RDS db.t4g.micro는 버스터블 크레딧 기반이라 실제로 뻗거나
과금이 튈 수 있음. 로컬(`apps/api-server` + 로컬 Postgres)에서 돌리는 걸
기본으로 하고, 실제 인프라 캐파가 필요해지면 `infra/terraform`으로 같은
스펙의 임시 스택을 하나 더 띄워서 쓰고 끝나면 지운다 — 이 디렉토리의
스크립트/시나리오는 `BASE_URL` 하나만 바꾸면 그 스택에도 그대로 재사용
가능.

## 준비물

- `nvm use` (Node 24.14.0 — `seed.ts`가 빌드 없이 `node seed.ts`로
  바로 돌아가는 이유가 이 버전의 네이티브 TS type-stripping). 안 하고
  돌리면 `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension
  ".ts"`로 바로 실패함 — 이 에러 보이면 `nvm use` 안 한 것.
- `k6` (`brew install k6`) — CLI 자체는 완전 무료/오픈소스. 유료 요금제는
  분산 실행/대시보드를 대신 해주는 k6 Cloud 얘기고 이 규모에선 불필요.
- 로컬 `apps/api-server`가 마이그레이션까지 적용된 Postgres를 보고 있을 것
  (`pnpm --filter api-server db:migrate`)
- `cd tools/load-test && pnpm install` (런타임 의존성은 `postgres` 드라이버
  하나뿐. `@types/node`는 에디터 자동완성/타입 힌트용 devDependency일 뿐 —
  `seed.ts` 실행 자체엔 필요 없음, Node의 네이티브 TS 지원은 타입을
  검사가 아니라 제거만 하기 때문)
- `cp .env.example .env`(`tools/load-test/` 안에서), 값 채우기(각 변수
  설명은 `.env.example` 주석 참고). `.env`는 gitignore 대상 — 실제 값은
  커밋 금지.

## `.env`는 자동으로 읽힘 — 매번 source할 필요 없음

- `seed.ts`는 시작할 때 `process.loadEnvFile('.env')`(Node 24 내장, 별도
  dotenv 라이브러리 없음)로 알아서 읽는다. `.env`가 없으면 조용히 넘어감
  (에러 안 남).
- `pnpm run scenario:*`는 각 스크립트 안에 `.env`가 있으면 source하는
  구문이 이미 들어있다(`package.json` 참고) — 새 터미널을 열든 뭘 하든
  매번 자동으로 반영됨.
- 직접 `k6 run scenarios/xxx.js`처럼 `pnpm run` 없이 돌릴 때만 예외 —
  이땐 k6 자체엔 `.env` 로더가 없어서(`--include-system-env-vars`로 진짜
  시스템 환경변수만 읽음) 그 경우에 한해 `set -a && . .env && set +a`를
  먼저 해줘야 함. 기본은 `pnpm run scenario:*` 쓰는 걸 추천 — 이게 그
  번거로움이 없는 경로.

## 1. 픽스처 시딩

```bash
pnpm run seed
# 옵션: pnpm run seed -- --users=100 --requests=300 --queue-pool=15 (기본값)
```

`/auth/signup`·`/auth/login`·게스트 쿠키 발급 절차를 전부 건너뛰고
`users`/`sessions`/`requests`/`replies` 테이블에 직접 insert한다 —
그래서 이메일 인증이 나중에 붙어도(또는 세션이 JWT로 바뀌어도) 이 방식
자체는 안 바뀐다. 세션 토큰은 `tools/load-test/.output/tokens.json`에 저장되고
`scenarios/*.js`가 이걸 읽어서 `Authorization: Bearer <token>`으로 씀.

모든 픽스처는 `loadtest-`로 태그돼있음(이메일 로컬파트, guest_id 전부) —
시나리오가 실행 중에 만드는 guest_id도 반드시 이 접두사를 유지해야
`--cleanup`이 찾아서 지울 수 있다.

같은 계정으로 재시딩하면 이메일 unique 제약에 걸리므로, 재시딩 전엔 항상
먼저 정리한다:

```bash
pnpm run cleanup
```

## 2. 시나리오 실행

| 파일 | 무엇을 보는가 | 종류 |
|---|---|---|
| `scenarios/logged-in-read-write.js` | 로그인 유저 대량 read/write | 캐파("얼마나 버티나") |
| `scenarios/anonymous-read.js` | 비로그인 읽기 트래픽(가장 흔한 패턴) | 캐파 |
| `scenarios/ip-throttle.js` | IP 기준 rate limit(전역 100/60s, auth 5/60s)이 실제로 작동하는가 | 정합성 |
| `scenarios/guest-reply-abuse.js` | guest_id 쿠키 회전으로 `guestReplyLimit` 우회되는가 | 정합성/어뷰징 확인 |
| `scenarios/queue-concurrency.js` | 좁은 큐 풀에 동시 요청 시 큐 랭킹 로직이 안 깨지는가 | 정합성/레이스컨디션 |

```bash
pnpm run scenario:logged-in-read-write
pnpm run scenario:anonymous-read
pnpm run scenario:ip-throttle
pnpm run scenario:guest-reply-abuse
pnpm run scenario:queue-concurrency
```

**`①④`(캠파 시나리오, `logged-in-read-write`/`anonymous-read`)는
`.env`의 `LOAD_TEST_BYPASS_TOKEN`이 채워져 있어야 의미 있는 숫자가
나온다** — 비어있으면(기본값) k6 VU가 몇 개든 이 머신의 실제 IP 하나로
몰려서 앱의 전역 `ThrottlerGuard`(100req/60s/IP)에 거의 다 막히고,
결과가 "처리량"이 아니라 "스로틀이 걸렸다"만 보여준다(측정값: 토큰 없이
~93% 실패). `apps/api-server/.env`의 `LOAD_TEST_BYPASS_TOKEN`과 정확히
같은 값이어야 함. ②③⑤는 이 값을 아예 안 쓰므로, 이 셋만 돌릴 거면
비워둬도 무방(스크립트 자체가 이 변수를 읽지 않음). 로컬에서만 쓸
임의의 문자열이면 충분 — 프로덕션 `.env`/SSM엔 이 값을 절대 넣지 말 것
(어차피 `NODE_ENV=production`이면 무시되긴 하지만).

`--summary-export`는 k6 내장 옵션 — 터미널에 찍히는 컬러 요약은 그대로
유지하면서, 같은 내용을 JSON으로 파일에도 남긴다(추가 스크립트/외부
라이브러리 없음). `tools/load-test/.output/`은 `.gitignore`에 있어서
**깃허브엔 절대 안 올라감** — 로컬에만 남는 직전 1회 실행의 상세 원본.

`pnpm run scenario:*`는 그 뒤에 `record-result.ts`를 자동으로 체이닝해서,
실행할 때마다 핵심 지표(체크 통과/실패, p95, 에러율, 커스텀 메트릭 등)
한 줄을 `results/<시나리오>.jsonl`에 append한다 — 이건 **git 추적 대상**
(누적 실행 기록). 사람이 손으로 옮겨 적지 않고 항상 자동으로 쌓인다.
렌더링/시각화는 별도 스코프, 아직 없음.

### `logged-in-read-write`/`anonymous-read`의 한계치 찾기

`MAX_VUS`로 목표 동시 VU 수를 조정 가능(기본값은 각각 100/150, 스테이지
비율은 유지된 채 목표치만 커짐):

```bash
MAX_VUS=500 pnpm run scenario:logged-in-read-write
```

### 결과 해석 시 주의

- `logged-in-read-write`/`anonymous-read`: 일반적인 k6 threshold(에러율,
  p95 지연시간)로 pass/fail 판단. 숫자는 첫 로컬 실행 결과 보고 조정.
- `ip-throttle`: **429가 나오는 게 정상이자 성공 조건**이다(스로틀이 실제로
  걸리는지 확인하는 거라서). `throttled_429_total` 카운터가 0이면 오히려
  스로틀이 작동을 안 하고 있다는 뜻 — threshold가 그 경우 자동으로
  fail 처리함.
- `guest-reply-abuse`: 마지막 두 체크(limit 초과 시 409, guest_id 바꾸면
  다시 201)는 버그를 찾는 게 아니라 **이미 알려진 구멍을 재현/문서화**하는
  목적. 이 결과 자체를 "고쳐야 할 버그"로 보고하지 말 것 — 별도로
  IP 기반 한도까지 얹을지는 제품 판단이 필요한 별개 논의.
- `queue-concurrency`: 개별 reply의 409는 정상(레이스에서 진 것). 5xx가
  하나라도 나오면(`queue_5xx_total`) 그건 진짜 버그.

## 3. 정리

```bash
pnpm run cleanup
```

`queue-concurrency`/`guest-reply-abuse` 시나리오가 실행 중에 만든
요청/답장도 전부 `loadtest-` 태그를 달고 있어서 같이 정리된다.
