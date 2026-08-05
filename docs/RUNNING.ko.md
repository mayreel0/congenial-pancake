# 위로/칭찬 교환 MVP 실행 가이드

현재 구현 기준 도메인은 `ComfortRequest`/`ComfortReply`입니다. 기존 칭찬 커뮤니티의 게시글, 댓글, 랭킹, 자동 AI 칭찬 worker는 피벗 과정에서 제거되었습니다.

## 필요한 것

- Node.js 22 이상
- npm
- PostgreSQL
- 선택적 Gemini/OpenAI provider 키

## 설치

```bash
npm install
cp .env.example .env
```

기본 환경 변수 예시는 아래와 같습니다.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/praise_community"
AUTH_SECRET="replace-with-local-secret"
AUTH_URL="http://localhost:3000"
NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""
AI_PROVIDER="gemini"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.1-flash-lite"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

`AUTH_SECRET`은 로컬에서 아래 명령으로 만들 수 있습니다.

```bash
openssl rand -base64 32
```

## 데이터베이스

```bash
createdb praise_community
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

공유 개발 DB나 운영 DB에는 개발용 `migrate dev` 대신 커밋된 마이그레이션만 적용합니다.

```bash
npm run prisma:deploy
```

시드 계정 비밀번호는 모두 `password1234`입니다.

- `author@example.com`
- `moderator@example.com`

## 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

진단 worker heartbeat를 확인하려면 별도 터미널에서 실행합니다.

```bash
npm run jobs:dev
```

MVP에서는 AI가 공개 답변을 자동 작성하지 않습니다. AI provider 설정은 이후 작성 보조와 콘텐츠 품질 필터 기능을 위해 유지됩니다.

## 손으로 확인할 흐름

1. `author@example.com`으로 로그인합니다.
2. 오늘 위로 요청을 작성합니다.
3. 다른 계정으로 로그인해 답변을 작성합니다.
4. 첫 답변 알림이 `/notifications`에 표시되는지 확인합니다.
5. `/me`에서 내가 쓴 위로 요청과 내가 남긴 답변을 확인합니다.
6. `moderator@example.com`으로 로그인해 `/moderation`에 접근합니다.
7. 보류된 위로 요청/답변, 열린 신고, 신뢰 점수 조정, worker 상태를 확인합니다.

## 검증

```bash
npm run test
npm run build
npx tsc --noEmit
```

일반 변경 완료 전에는 아래 통합 검증을 사용합니다.

```bash
npm run verify
```

E2E 테스트는 `DATABASE_URL`이 없으면 DB 기반 흐름을 자동으로 스킵합니다.

```bash
npx playwright install
npm run test:e2e
```

## 자주 막히는 지점

### `DATABASE_URL` 오류

`.env`가 없거나 DB 주소가 실제 PostgreSQL 설정과 다를 때 발생합니다. `.env`를 확인하고 PostgreSQL이 실행 중인지 확인하세요.

### `createdb` 명령이 없음

PostgreSQL 설치 경로가 PATH에 없을 수 있습니다. 공식 설치본을 썼다면 설치된 PostgreSQL의 `bin` 경로를 PATH에 추가하거나 GUI 도구에서 데이터베이스를 만들어도 됩니다.

### Playwright 브라우저 없음

아래 명령을 실행합니다.

```bash
npx playwright install
```
