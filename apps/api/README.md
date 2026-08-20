# api

온설 백엔드(Nest.js). 앱별 작업 규칙은 `AGENTS.md`를 참고한다.

## Local Development

```bash
cp .env.example .env   # DATABASE_URL을 로컬 Postgres로 채운다
pnpm --filter api start:dev
```

## Verification

```bash
pnpm --filter api lint
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api build
```

## Database

```bash
pnpm --filter api db:generate   # 스키마 변경 → 마이그레이션 SQL 생성
pnpm --filter api db:migrate    # 마이그레이션 적용
```
