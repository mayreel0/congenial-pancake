import { Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
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
    .addCookieAuth(config.get('SESSION_COOKIE_NAME', { infer: true }))
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, openApiConfig);
}
