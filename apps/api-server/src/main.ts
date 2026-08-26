import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { guestIdMiddleware } from './common/middleware/guest-id.middleware';
import type { Env } from './config/env.schema';

// Empty on purpose — its only job is hosting the pre-generated OpenAPI
// document on its own port (see bootstrap() below). No controllers, no
// providers, no DB connection: this is not a second copy of the real app.
@Module({})
class SwaggerDocsModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Env, true>);

  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    // Behind a reverse proxy, req.ip is the proxy's address unless Express
    // is told to read X-Forwarded-For — without this every request shares
    // one IP and rate limiting throttles the whole app as a single client.
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(guestIdMiddleware(config));
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  // Every controller input is a DTO class (class-validator decorators);
  // reject anything with fields a DTO doesn't declare. See apps/api/AGENTS.md.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AppExceptionFilter());

  // Served on its own port (SWAGGER_PORT), not a path on the main API —
  // same reasoning as apps/admin getting its own port instead of a path
  // inside apps/web: the separation itself is the point, so the path can
  // just be "/" once that's true. Kept on in production (unlike a typical
  // internal-only setup) since this API has no other consumer-facing
  // documentation yet. See docs/decisions/2026-08-26-onseol-openapi-
  // decisions.md.
  const openApiConfig = new DocumentBuilder()
    .setTitle('온설 API')
    .setDescription(
      '온설 백엔드 API 문서. 세션 인증은 httpOnly 쿠키(SESSION_COOKIE_NAME) 또는 Authorization: Bearer 헤더 중 하나로 가능합니다.',
    )
    .setVersion('1.0')
    .addCookieAuth(config.get('SESSION_COOKIE_NAME', { infer: true }))
    .addBearerAuth()
    .build();
  // Generated from the real app (so it sees every real controller/DTO),
  // then handed to a second, otherwise-empty Nest app that only exists to
  // serve it — this avoids bootstrapping a whole redundant copy of
  // AppModule (DB pool, guards, etc.) just to host static docs.
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  const swaggerApp = await NestFactory.create<NestExpressApplication>(
    SwaggerDocsModule,
    { logger: false },
  );
  SwaggerModule.setup('', swaggerApp, openApiDocument);
  await swaggerApp.listen(config.get('SWAGGER_PORT', { infer: true }));

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
