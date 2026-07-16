# 칭찬 커뮤니티 실행 가이드

이 문서는 macOS에서 로컬 개발 환경을 준비하고 앱을 실행하는 방법을 정리합니다. 프로젝트 관련 표현은 기능 중심으로 쓰며, 서비스 경험은 “칭찬”을 중심으로 설명합니다.

## 필요한 것

- Node.js 22 이상
- npm
- PostgreSQL
- Redis
- AI 칭찬 생성을 위한 Gemini API 키, 또는 OpenAI로 전환할 경우 OpenAI API 키

## 1. 의존성 설치

```bash
npm install
```

## 2. PostgreSQL 준비

이미 PostgreSQL 공식 설치본을 설치했다면 그대로 사용해도 됩니다. `psql`과 `createdb`가 동작하는지만 먼저 확인하세요.

```bash
psql --version
pg_isready
```

Homebrew로 관리하고 싶다면 예시는 아래와 같습니다.

```bash
brew install postgresql@16
brew services start postgresql@16
```

데이터베이스를 만듭니다.

```bash
createdb praise_community
```

`createdb` 명령이 없다면 PostgreSQL의 `bin` 경로가 PATH에 없을 수 있습니다. 공식 설치본을 쓴 경우 설치 경로의 `bin` 디렉터리를 PATH에 추가하거나, pgAdmin/터미널에서 같은 이름의 데이터베이스를 만들어도 됩니다.

## 3. Redis 준비

AI 칭찬 작업 큐는 Redis를 사용합니다. Homebrew 예시는 아래와 같습니다.

```bash
brew install redis
brew services start redis
```

정상 동작 확인:

```bash
redis-cli ping
```

`PONG`이 나오면 됩니다.

## 4. 환경 변수 설정

예시 파일을 복사합니다.

```bash
cp .env.example .env
```

기본 예시는 아래와 같습니다.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/praise_community"
AUTH_SECRET="replace-with-local-secret"
AUTH_URL="http://localhost:3000"
AI_PROVIDER="gemini"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash-lite"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

`AUTH_SECRET`은 로컬에서 아래 명령으로 만들 수 있습니다.

```bash
openssl rand -base64 32
```

PostgreSQL 사용자/비밀번호가 다르면 `DATABASE_URL`을 본인 환경에 맞게 바꾸세요. 예를 들어 비밀번호가 없고 사용자명이 macOS 계정과 같다면 URL 형태가 달라질 수 있습니다.

## 5. Prisma 준비

Prisma Client를 만들고 마이그레이션을 적용합니다.

```bash
npm run prisma:generate
npm run prisma:migrate
```

초기 데이터를 넣습니다.

```bash
npm run prisma:seed
```

시드 계정 비밀번호는 모두 `password1234`입니다.

- `author@example.com`
- `moderator@example.com`

## 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

## 7. 손으로 확인할 흐름

1. `author@example.com`으로 로그인합니다.
2. 칭찬받고 싶은 글을 작성합니다.
3. 피드에서 글이 보이는지 확인합니다.
4. 글 상세 화면에서 댓글, 감사 반응, 답글 흐름을 확인합니다.
5. `/rankings`에서 랭킹 화면을 확인합니다.
6. `/me`에서 내 활동 화면을 확인합니다.
7. `moderator@example.com`으로 로그인해 `/moderation` 접근을 확인합니다.
8. `/moderation`의 AI 칭찬 제어에서 AI 사용 여부, 하루 작업 제한, 하루 댓글 제한, 오늘 사용량을 확인합니다.
9. `/moderation`에서 보류 댓글, 열린 신고, 신뢰 점수 조정, 오늘 AI 작업 로그, 랭킹 재계산을 확인합니다.

## 8. 테스트

단위/통합 테스트:

```bash
npm run test
```

빌드:

```bash
npm run build
```

타입 검사:

```bash
npx tsc --noEmit
```

E2E 테스트:

```bash
npx playwright install
npm run test:e2e
```

현재 E2E 스모크는 `DATABASE_URL`이 없으면 자동으로 스킵됩니다. 실제 화면 흐름까지 보려면 PostgreSQL이 켜져 있고 `.env`에 `DATABASE_URL`이 설정되어 있어야 합니다.

## 9. GitHub Actions CI

Pull Request와 `main` 브랜치 push에서 GitHub Actions CI가 실행됩니다. CI는 의존성 설치, Prisma Client 생성, lint, 단위/통합 테스트, production build, TypeScript 검사를 수행합니다.

## 10. AI 칭찬 작업 참고

AI 칭찬은 Redis 큐와 설정된 AI provider의 API 키가 필요합니다. 기본값은 `AI_PROVIDER="gemini"`, `GEMINI_API_KEY`, `GEMINI_MODEL="gemini-2.5-flash-lite"`입니다. OpenAI로 전환하려면 `AI_PROVIDER="openai"`, `OPENAI_API_KEY`, `OPENAI_MODEL`을 설정하세요. 작업 생성/정책/worker factory는 `src/server/jobs.ts`에 구현되어 있습니다. 로컬에서는 아래 명령으로 AI 칭찬 worker와 랭킹 재계산 worker를 함께 실행합니다.

```bash
npm run jobs:dev
```

worker는 시작 시 `.env`를 로드하고, `REDIS_URL`이나 선택된 AI provider API 키가 없으면 사전 경고를 출력합니다.

AI 칭찬 사용량 제한은 환경 변수가 아니라 데이터베이스 설정으로 관리합니다. 마이그레이션 후 기본값은 AI 사용, 하루 AI 작업 100건, 하루 AI 생성 댓글 300개입니다. 운영자는 `/moderation`에서 AI를 끄거나 제한값을 0부터 10000 사이의 정수로 조정할 수 있습니다. 제한에 걸린 작업은 Gemini/OpenAI 호출 전에 건너뛰며, 오늘 실행/스킵/실패 사용량은 UTC 하루 기준으로 집계됩니다.

운영자는 `/moderation`에서 오늘 AI 작업 로그를 보고, 보류 댓글 공개/작성자 전용/숨김 처리, 열린 신고 처리/기각, 신뢰 점수 조정, 랭킹 스냅샷 수동 재계산을 할 수 있습니다.

## 11. 자주 막히는 지점

### `DATABASE_URL` 오류

`.env`가 없거나 DB 주소가 실제 PostgreSQL 설정과 다를 때 발생합니다. `.env`를 확인하고 PostgreSQL이 실행 중인지 확인하세요.

### `createdb` 명령이 없음

PostgreSQL 설치 경로가 PATH에 없을 수 있습니다. 공식 설치본을 썼다면 설치된 PostgreSQL의 `bin` 경로를 PATH에 추가하거나 GUI 도구에서 데이터베이스를 만들어도 됩니다.

### Redis 연결 오류

Redis가 실행 중인지 확인합니다.

```bash
redis-cli ping
```

### Playwright 브라우저 없음

아래 명령을 실행합니다.

```bash
npx playwright install
```
