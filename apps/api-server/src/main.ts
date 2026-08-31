import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
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
  // Request validation/response serialization pipes are registered as
  // APP_PIPE/APP_INTERCEPTOR providers in app.module.ts (nestjs-zod needs
  // DI context) rather than here.
  app.useGlobalFilters(new AppExceptionFilter());

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
