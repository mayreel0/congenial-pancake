# 온설

온설은 짧은 위로 요청과 담백한 답장을 주고받는 서비스입니다.

이 저장소는 pnpm 워크스페이스 모노레포입니다:

- `apps/web` — 공개 사이트 (Next.js, `:3000`)
- `apps/admin` — 신고 검토/설정 관리자 앱 (Next.js, `:3002`)
- `apps/api-server` — 백엔드 (Nest.js, `:3001`)
- `apps/storybook-app` — 컴포넌트 스토리 (`:6006`)
- `packages/*` — 앱 간 공유 코드 (`ui`/`api`/`utils`/`shared`)

각 앱의 실제 작업 규칙(실행 방법, 아키텍처, 컨벤션)은 해당 디렉토리의 `AGENTS.md`를 참고하세요. 프로젝트 전체 규칙(브랜치 정책, 결정 확인 절차 등)은 루트 `AGENTS.md`에 있습니다.

## Local Development

Node 버전이 `.nvmrc`(24.14.0)로 고정돼 있습니다 — 다른 버전이면 `pnpm`이 `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`로 바로 실패합니다.

```bash
nvm use
corepack enable pnpm
pnpm install
```

앱마다 따로 실행합니다 (`apps/api-server`는 로컬 Postgres/`.env` 설정이 먼저 필요 — `apps/api-server/README.md` 참고):

```bash
pnpm --filter web dev               # :3000
pnpm --filter admin dev             # :3002
pnpm --filter api-server start:dev  # :3001
pnpm --filter storybook-app storybook  # :6006
```

## Verification

앱마다 공통으로 있습니다 (`web`/`admin`/`api-server`):

```bash
pnpm --filter <app> lint
pnpm --filter <app> typecheck
pnpm --filter <app> test
pnpm --filter <app> build
```
