import { json } from 'express';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { csrfOriginMiddleware } from './common/middleware/csrf-origin.middleware';
import { guestIdMiddleware } from './common/middleware/guest-id.middleware';
import type { Env } from './config/env.schema';

async function bootstrap() {
  // bodyParser: false + a JSON-only parser below — a form-urlencoded or
  // multipart body would let a <form> POST ride the session/guest_id
  // cookies and get parsed just like a real request (confirmed locally back
  // when those cookies were SameSite=None). They're Lax now, which already
  // keeps cross-site POSTs cookieless; this stays as a second layer. The
  // real frontend (packages/api's apiFetch) only ever sends
  // application/json, so this drops no legitimate traffic.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService<Env, true>);

  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    // Behind a reverse proxy, req.ip is the proxy's address unless Express
    // is told to read X-Forwarded-For — without this every request shares
    // one IP and rate limiting throttles the whole app as a single client.
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(json());
  // Runs before guestIdMiddleware/CORS — a request with a spoofed/foreign
  // Origin never needs a guest_id cookie or a CORS decision at all.
  app.use(csrfOriginMiddleware(config));
  app.use(guestIdMiddleware(config));
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  // Request validation/response serialization pipes are registered as
  // APP_PIPE/APP_INTERCEPTOR providers in app.module.ts (nestjs-zod needs
  // DI context) rather than here.
  app.useGlobalFilters(new AppExceptionFilter());

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
