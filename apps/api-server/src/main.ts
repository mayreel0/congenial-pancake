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

  // Mounted at a non-predictable path, not "/docs"/"/api-docs" — see
  // SWAGGER_DOCS_PATH's comment in config/env.schema.ts. Kept on in
  // production (unlike a typical internal-only setup) since this API has
  // no other consumer-facing documentation yet.
  const openApiConfig = new DocumentBuilder()
    .setTitle('온설 API')
    .setDescription(
      '온설 백엔드 API 문서. 세션 인증은 httpOnly 쿠키(SESSION_COOKIE_NAME) 또는 Authorization: Bearer 헤더 중 하나로 가능합니다.',
    )
    .setVersion('1.0')
    .addCookieAuth(config.get('SESSION_COOKIE_NAME', { infer: true }))
    .addBearerAuth()
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup(
    config.get('SWAGGER_DOCS_PATH', { infer: true }),
    app,
    openApiDocument,
  );

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
