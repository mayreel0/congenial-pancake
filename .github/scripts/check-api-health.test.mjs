import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);

const script = fileURLToPath(new URL('./check-api-health.sh', import.meta.url));

async function check(url, attempts = '1') {
  return await new Promise((resolve) => {
    const child = spawn('bash', [script, url], {
      env: { ...process.env, HEALTH_ATTEMPTS: attempts, HEALTH_INTERVAL: '0' },
    });
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    child.on('close', (code) => resolve({ code, output }));
  });
}

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}/health`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('200 succeeds against a real HTTP server', async () => {
  await withServer((req, res) => res.end('{"status":"ok"}'), async (url) => {
    assert.equal((await check(url)).code, 0);
  });
});

test('503 never counts as a successful deployment', async () => {
  await withServer((req, res) => { res.writeHead(503); res.end(); }, async (url) => {
    const result = await check(url);
    assert.equal(result.code, 1);
    assert.match(result.output, /503/);
  });
});

test('retries startup until 200', async () => {
  let requests = 0;
  await withServer((req, res) => {
    res.writeHead(++requests < 3 ? 503 : 200);
    res.end();
  }, async (url) => {
    assert.equal((await check(url, '3')).code, 0);
    assert.equal(requests, 3);
  });
});

test('redirects are not accepted as 200', async () => {
  await withServer((req, res) => {
    res.writeHead(302, { Location: '/login' });
    res.end();
  }, async (url) => assert.equal((await check(url)).code, 1));
});

test('connection failure is reported', async () => {
  const result = await check('http://127.0.0.1:1/health');
  assert.equal(result.code, 1);
  assert.match(result.output, /000/);
});

test('workflow-generated SSM payload passes the URL without expanding the embedded script', async () => {
  await withServer((req, res) => res.end('{"status":"ok"}'), async (url) => {
    const workflow = readFileSync(new URL('../workflows/deploy-api.yml', import.meta.url), 'utf8');
    const generation = 'COMMANDS_JSON=$(jq -n' + workflow.split('COMMANDS_JSON=$(jq -n')[1]
      .split('\n          COMMAND_ID=')[0];
    const { stdout } = await execute('bash', ['-c', generation + '\nprintf "%s\\n" "$COMMANDS_JSON"'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      env: {
        ...process.env,
        ECR_REPOSITORY: 'example.invalid/api', GITHUB_SHA: 'test-sha',
        AWS_REGION: 'ap-northeast-2', APP_PORT: new URL(url).port,
        DB_SECRET_ARN: 'test-secret', DB_ENDPOINT: 'example.invalid:5432',
      },
    });
    const payload = JSON.parse(stdout);
    assert.equal(payload.commands[0], 'set -eu');
    assert.ok(payload.commands.some((command) => command.startsWith('docker pull example.invalid/api:test-sha')));
    const runCommand = payload.commands.find((command) => command.startsWith('docker run '));
    assert.equal(runCommand.split(' ').at(-1), 'example.invalid/api:test-sha');
    const refreshCommand = payload.commands[2]
      .replaceAll('/etc/onseol-api.env.new', '/dev/null')
      .replaceAll('/etc/onseol-api.env', '/dev/null');
    await assert.rejects(execute('bash', ['-c',
      'set -eu; aws() { echo test-value; }; awk() { return 42; }; ' +
      'mv() { echo UNEXPECTED_MOVE; }; ' + refreshCommand + '\necho DEPLOY_CONTINUED',
    ]), (error) => error.code === 42 && !error.stdout.includes('DEPLOY_CONTINUED'));
    const result = await execute('bash', ['-c', payload.commands.at(-1)], {
      env: { ...process.env, HEALTH_ATTEMPTS: '1', HEALTH_INTERVAL: '0' },
    });
    assert.match(result.stdout, /Health verified/);
  });
});
