import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { buildOpenApiDocument, SwaggerDocsModule } from './openapi';
import type { Env } from './config/env.schema';

// Standalone entry point for `pnpm --filter api-server start:swagger` —
// builds the real OpenAPI document from AppModule's actual
// controllers/DTOs (so it still needs a valid .env — DATABASE_URL etc. —
// same as main.ts, though it never queries the DB), but only ever opens
// SWAGGER_PORT. PORT (the real API) is never listened on here, so no real
// API traffic is reachable from this process at all — useful for browsing
// docs without also standing up the full live app.
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  const config = app.get(ConfigService<Env, true>);
  const openApiDocument = buildOpenApiDocument(app, config);

  const swaggerApp = await NestFactory.create<NestExpressApplication>(
    SwaggerDocsModule,
    { logger: false },
  );
  SwaggerModule.setup('', swaggerApp, openApiDocument);
  await swaggerApp.listen(config.get('SWAGGER_PORT', { infer: true }));

  console.log(
    `Swagger docs only: http://localhost:${config.get('SWAGGER_PORT', { infer: true })}`,
  );
}
void bootstrap();
