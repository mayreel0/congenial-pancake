// Renders results/*.jsonl as terminal tables — never saved anywhere, always
// regenerated from the raw jsonl records. jsonl is the committed artifact;
// this script's output is a disposable view on top of it.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(__dirname, 'results');

type RunRecord = {
  timestamp: string;
  params?: Record<string, number>;
  http_req_duration_p95_ms?: number | null;
  http_req_failed_rate?: number | null;
  http_reqs_count?: number | null;
  checks?: Record<string, { passes: number; fails: number }>;
  custom_metrics?: Record<string, { count?: number; rate?: number }>;
};

function formatRow(rec: RunRecord): Record<string, string> {
  const row: Record<string, string> = {
    시간: new Date(rec.timestamp).toLocaleString('ko-KR', { hour12: false }),
  };

  for (const [key, value] of Object.entries(rec.params ?? {})) {
    row[key] = String(value);
  }

  if (rec.http_req_duration_p95_ms != null) {
    row.p95 = `${rec.http_req_duration_p95_ms.toFixed(1)}ms`;
  }
  if (rec.http_req_failed_rate != null) {
    row['에러율'] = `${(rec.http_req_failed_rate * 100).toFixed(1)}%`;
  }
  if (rec.http_reqs_count != null) {
    row['총요청'] = String(rec.http_reqs_count);
  }

  for (const [name, m] of Object.entries(rec.custom_metrics ?? {})) {
    if (m.count != null) row[name] = String(m.count);
  }

  const checkTotals = Object.values(rec.checks ?? {}).reduce(
    (acc, c) => ({ passes: acc.passes + c.passes, fails: acc.fails + c.fails }),
    { passes: 0, fails: 0 },
  );
  if (checkTotals.passes + checkTotals.fails > 0) {
    row['체크(성공/실패)'] = `${checkTotals.passes}/${checkTotals.fails}`;
  }

  return row;
}

if (!existsSync(resultsDir)) {
  console.log('아직 기록된 결과가 없습니다 — 시나리오를 먼저 실행하세요 (pnpm run scenario:*).');
  process.exit(0);
}

const files = readdirSync(resultsDir)
  .filter((f) => f.endsWith('.jsonl'))
  .sort();

if (files.length === 0) {
  console.log('아직 기록된 결과가 없습니다 — 시나리오를 먼저 실행하세요 (pnpm run scenario:*).');
  process.exit(0);
}

for (const file of files) {
  const scenario = file.replace(/\.jsonl$/, '');
  const lines = readFileSync(join(resultsDir, file), 'utf-8')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  const records: RunRecord[] = lines.map((line) => JSON.parse(line));
  records.sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first

  console.log(`\n${scenario}`);
  console.table(records.map(formatRow));
}
