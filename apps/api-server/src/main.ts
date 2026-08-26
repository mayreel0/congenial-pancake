import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { guestIdMiddleware } from './common/middleware/guest-id.middleware';
import { buildOpenApiDocument, SwaggerDocsModule } from './openapi';
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

  // Served on its own port (SWAGGER_PORT), not a path on the main API —
  // same reasoning as apps/admin getting its own port instead of a path
  // inside apps/web: the separation itself is the point, so the path can
  // just be "/" once that's true. Kept on in production (unlike a typical
  // internal-only setup) since this API has no other consumer-facing
  // documentation yet. See docs/decisions/2026-08-26-onseol-openapi-
  // decisions.md. `pnpm --filter api-server start:swagger` runs docs-only
  // (src/swagger-only.ts), for when you want the docs without the real
  // API also being reachable.
  const openApiDocument = buildOpenApiDocument(app, config);
  const swaggerApp = await NestFactory.create<NestExpressApplication>(
    SwaggerDocsModule,
    { logger: false },
  );
  SwaggerModule.setup('', swaggerApp, openApiDocument);
  await swaggerApp.listen(config.get('SWAGGER_PORT', { infer: true }));

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
