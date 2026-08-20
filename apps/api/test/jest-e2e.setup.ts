// e2e tests only exercise routes that don't touch the DB yet (e.g. /health),
// so a syntactically valid but unreachable DATABASE_URL is enough to pass
// env validation and let DatabaseModule construct its (lazy) client.
process.env.DATABASE_URL ??=
  'postgres://user:password@localhost:5432/onseol_test';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
