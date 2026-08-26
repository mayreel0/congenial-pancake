import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().default('session_token'),
  // Comma-separated — apps/web and apps/admin are separate origins (see
  // docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md), both
  // need to be CORS-allowed to make credentialed requests here.
  CORS_ORIGIN: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(z.string().url()).min(1)),
  // Where this API is publicly reachable — used to build the Google OAuth
  // redirect_uri, which must exactly match what's registered in the Google
  // Cloud Console.
  API_PUBLIC_URL: z.string().url(),
  // apps/web specifically — Google OAuth is a public-site-only feature (the
  // admin app has no Google login), so its post-login redirect target can't
  // be derived from CORS_ORIGIN's now-multi-origin list.
  WEB_PUBLIC_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ADMIN_USER_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  // Swagger/OpenAPI UI mount path — deliberately not a predictable path
  // like "/docs" or "/api-docs" (same reasoning as apps/admin's split: not
  // a secret, but no reason to make it the first thing a scanner tries).
  // See docs/decisions/2026-08-26-onseol-openapi-decisions.md. Meant to be
  // replaced by real host-based subdomain separation once this project has
  // actual deploy infra — this is the interim measure.
  SWAGGER_DOCS_PATH: z.string().default('api-reference-x7k2m9'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
