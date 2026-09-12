# syntax=docker/dockerfile:1
# Build context is the repo root (packages/shared is a workspace dependency):
#   docker build -f apps/api-server/Dockerfile -t onseol-api .

FROM node:24.14.0-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api-server/package.json apps/api-server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter api-server...

FROM deps AS build
COPY apps/api-server apps/api-server
COPY packages/shared packages/shared
RUN pnpm --filter api-server build

FROM node:24.14.0-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api-server/node_modules apps/api-server/node_modules
COPY --from=build /app/apps/api-server/package.json apps/api-server/package.json
COPY --from=build /app/apps/api-server/dist apps/api-server/dist
COPY --from=build /app/apps/api-server/drizzle apps/api-server/drizzle
COPY --from=build /app/apps/api-server/drizzle.config.ts apps/api-server/drizzle.config.ts
COPY --from=build /app/packages/shared packages/shared
EXPOSE 3001
WORKDIR /app/apps/api-server
# Migrate before serving traffic — every deploy (see
# .github/workflows/deploy-api.yml) just restarts this container with a
# new image, so this is the one place a schema change actually gets
# applied. Safe with today's single-instance setup; revisit if Phase 2
# (Auto Scaling Group) ever starts more than one of these at once, since
# concurrent `migrate` runs aren't guaranteed race-safe. Calls the
# drizzle-kit binary directly rather than through `pnpm exec` — this
# image has no root pnpm-workspace.yaml/package.json (deliberately slim),
# and `pnpm exec` insists on a full workspace-consistency check first,
# which fails without one.
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node dist/src/main"]
