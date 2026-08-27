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
  // Where this API is publicly reachable — used to build each OAuth
  // provider's redirect_uri (${API_PUBLIC_URL}/auth/{provider}/callback),
  // which must exactly match what's registered in that provider's own
  // developer console.
  API_PUBLIC_URL: z.string().url(),
  // apps/web specifically — OAuth login is a public-site-only feature (the
  // admin app has none), so its post-login redirect target can't be
  // derived from CORS_ORIGIN's now-multi-origin list.
  WEB_PUBLIC_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // Kakao/Naver are optional (default '') so the app still boots without
  // them configured — hitting /auth/kakao or /auth/naver with an empty
  // client id just fails on that provider's side (invalid_client) rather
  // than the whole app refusing to start. Set these once you've registered
  // an app in each provider's developer console (developers.kakao.com,
  // developers.naver.com — Claude can't create those accounts for you).
  KAKAO_CLIENT_ID: z.string().default(''),
  KAKAO_CLIENT_SECRET: z.string().default(''),
  NAVER_CLIENT_ID: z.string().default(''),
  NAVER_CLIENT_SECRET: z.string().default(''),
  // Email verification — EmailService tries providers in this order
  // (Resend first, Naver Cloud Mailer as fallback), so both sets of
  // credentials are optional the same way Kakao/Naver's are: the app boots
  // without them, a provider whose credentials are empty just fails its
  // send attempt (falling through to the next provider, or throwing if
  // it's the last one) rather than the whole app refusing to start.
  RESEND_API_KEY: z.string().default(''),
  // Must be a verified sending domain in Resend for anything beyond their
  // own onboarding@resend.dev test address — see resend.com/domains.
  RESEND_FROM_EMAIL: z.string().default(''),
  NAVER_CLOUD_MAILER_ACCESS_KEY: z.string().default(''),
  NAVER_CLOUD_MAILER_SECRET_KEY: z.string().default(''),
  // Must be a sender address pre-verified in the NCP Cloud Outbound Mailer
  // console — the API rejects sends from an unverified address.
  NAVER_CLOUD_MAILER_FROM_EMAIL: z.string().default(''),
  ADMIN_USER_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  // Swagger/OpenAPI UI runs on its own port, separate from PORT — same
  // reasoning as apps/admin getting its own port instead of a path inside
  // apps/web. See docs/decisions/2026-08-26-onseol-openapi-decisions.md.
  SWAGGER_PORT: z.coerce.number().int().positive().default(8081),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
