// Appends one line per run to results/<scenario>.jsonl, extracting the key
// metrics from a k6 --summary-export JSON. Chained automatically after
// every `pnpm run scenario:*` (see package.json) — never hand-typed, so
// the history can't drift from what actually ran.
//
// results/*.jsonl are git-tracked (unlike .output/, which holds the full
// raw per-run k6 export and is gitignored) — this is the actual, growing
// result artifact. Rendering/reporting on top of this data is a separate,
// later feature; this script only appends structured records.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dotenvPath = join(__dirname, '.env');
if (existsSync(dotenvPath)) process.loadEnvFile(dotenvPath);

const [, , scenario, summaryPath, relevantParamsArg] = process.argv;
if (!scenario || !summaryPath) {
  console.error(
    'usage: node record-result.ts <scenario> <summary-export-json-path> [comma,separated,env,var,names]',
  );
  process.exit(1);
}
// Only record the env vars a scenario actually reads — otherwise whatever
// happens to be set in .env (e.g. GUEST_REPLY_LIMIT, only meaningful for
// guest-reply-abuse) would show up as a "param" on every scenario's rows.
const relevantParamNames = relevantParamsArg ? relevantParamsArg.split(',') : [];

type K6Check = { passes: number; fails: number };
type K6CounterOrRate = { count?: number; rate?: number };

const summary = JSON.parse(readFileSync(summaryPath, 'utf-8')) as {
  metrics?: Record<string, Record<string, number> & K6CounterOrRate>;
  root_group?: { checks?: Record<string, K6Check> };
};

const metrics = summary.metrics ?? {};
const checks = summary.root_group?.checks ?? {};

// Everything k6 always emits, regardless of scenario — anything else in
// `metrics` is a scenario-specific custom metric (e.g. throttled_429_total,
// queue_5xx_total) worth recording generically. Tagged sub-metrics like
// `http_req_duration{expected_response:true}` are skipped — same data,
// filtered variant.
const STANDARD_METRIC_KEYS = new Set([
  'vus',
  'vus_max',
  'iterations',
  'iteration_duration',
  'http_reqs',
  'http_req_blocked',
  'http_req_connecting',
  'http_req_tls_handshaking',
  'http_req_sending',
  'http_req_waiting',
  'http_req_receiving',
  'http_req_duration',
  'http_req_failed',
  'data_sent',
  'data_received',
  'checks',
]);

const customMetrics: Record<string, K6CounterOrRate> = {};
for (const [name, value] of Object.entries(metrics)) {
  if (STANDARD_METRIC_KEYS.has(name) || name.includes('{')) continue;
  customMetrics[name] = { count: value.count, rate: value.rate };
}

const params: Record<string, number> = {};
for (const name of relevantParamNames) {
  const value = process.env[name];
  if (value) params[name] = Number(value);
}

const record = {
  timestamp: new Date().toISOString(),
  params,
  http_req_duration_p95_ms: metrics.http_req_duration?.['p(95)'] ?? null,
  http_req_failed_rate: metrics.http_req_failed?.value ?? null,
  http_reqs_count: metrics.http_reqs?.count ?? null,
  checks: Object.fromEntries(
    Object.entries(checks).map(([name, c]) => [name, { passes: c.passes, fails: c.fails }]),
  ),
  custom_metrics: customMetrics,
};

const resultsDir = join(__dirname, 'results');
mkdirSync(resultsDir, { recursive: true });
const outPath = join(resultsDir, `${scenario}.jsonl`);
appendFileSync(outPath, `${JSON.stringify(record)}\n`);
console.log(`Recorded to ${outPath}`);
