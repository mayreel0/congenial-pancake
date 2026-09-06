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
COPY --from=build /app/packages/shared packages/shared
EXPOSE 3001
WORKDIR /app/apps/api-server
CMD ["node", "dist/src/main"]
