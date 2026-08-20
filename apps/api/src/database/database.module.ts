import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../config/env.schema';
import { DRIZZLE } from './database.constants';
import * as schema from './schema';

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const client = postgres(config.get('DATABASE_URL', { infer: true }));
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
