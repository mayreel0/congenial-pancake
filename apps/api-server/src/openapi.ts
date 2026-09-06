import { Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from './config/env.schema';

// Empty on purpose — its only job is hosting a pre-generated OpenAPI
// document on its own port (see main.ts and swagger-only.ts). No
// controllers, no providers, no DB connection: this is not a second copy
// of the real app.
@Module({})
export class SwaggerDocsModule {}

// Shared by main.ts (serves this alongside the real API) and
// swagger-only.ts (serves only this, no real API traffic) so the
// DocumentBuilder config lives in exactly one place.
export function buildOpenApiDocument(
  app: INestApplication,
  config: ConfigService<Env, true>,
): OpenAPIObject {
  const openApiConfig = new DocumentBuilder()
    .setTitle('온설 API')
    .setDescription(
      '온설 백엔드 API 문서. 세션 인증은 httpOnly 쿠키(SESSION_COOKIE_NAME) 또는 Authorization: Bearer 헤더 중 하나로 가능합니다.',
    )
    .setVersion('1.0')
    // Lets "Try it out" actually reach the real API — swagger-only.ts serves
    // this doc from a second, routeless app on its own port (SWAGGER_PORT),
    // so without an explicit server the UI would default to sending
    // requests back to itself. Requires CORS_ORIGIN to also allow
    // SWAGGER_PORT's origin for "Try it out" to work cross-origin when both
    // processes are running together — see .env.example.
    .addServer(config.get('API_PUBLIC_URL', { infer: true }))
    .addCookieAuth(config.get('SESSION_COOKIE_NAME', { infer: true }))
    .addBearerAuth()
    .build();
  // Post-processes schemas generated from nestjs-zod DTOs (dedupes shared
  // references, fixes a few zod->OpenAPI edge cases) — required whenever
  // any controller uses createZodDto, per nestjs-zod's own setup docs.
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, openApiConfig));
}
