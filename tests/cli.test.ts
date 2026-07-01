import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const tsxBin = path.join(rootDir, 'node_modules', '.bin', 'tsx');
const cliPath = path.join(rootDir, 'src', 'cli.ts');
const siteDir = fileURLToPath(new URL('./fixtures/site', import.meta.url));

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      tsxBin,
      [cliPath, ...args],
      { cwd: rootDir, timeout: 30_000 },
      (error, stdout, stderr) => {
        resolve({ code: error && 'code' in error ? Number(error.code) : 0, stdout, stderr });
      },
    );
  });
}

describe('CLI (end to end, offline)', () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), 'shipcheck-cli-'));
  });
  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it('scans a local fixture and exits 0 by default', async () => {
    const { code, stdout } = await runCli([siteDir]);
    expect(code).toBe(0);
    expect(stdout).toContain('ShipCheck report');
    expect(stdout).toMatch(/Score: \d+\/100/);
  });

  it('emits parseable JSON with --json', async () => {
    const { code, stdout } = await runCli([siteDir, '--json']);
    expect(code).toBe(0);
    const report = JSON.parse(stdout) as { score: number; issues: unknown[] };
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it('exits 1 with --fail-on warning when issues exist', async () => {
    const { code } = await runCli([siteDir, '--fail-on', 'warning']);
    expect(code).toBe(1);
  });

  it('applies --min-score as a CI threshold', async () => {
    expect((await runCli([siteDir, '--min-score', '100'])).code).toBe(1);
    expect((await runCli([siteDir, '--min-score', '0'])).code).toBe(0);
  });

  it('rejects an out-of-range or non-numeric --min-score', async () => {
    const bad = await runCli([siteDir, '--min-score', '150']);
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain('--min-score');
    expect((await runCli([siteDir, '--min-score', 'abc'])).code).toBe(1);
  });

  it('rejects unknown --report and --fail-on values', async () => {
    const report = await runCli([siteDir, '--report', 'bogus']);
    expect(report.code).toBe(1);
    expect(report.stderr).toContain('Unknown report type');

    const failOn = await runCli([siteDir, '--fail-on', 'bogus']);
    expect(failOn.code).toBe(1);
    expect(failOn.stderr).toContain('Unknown --fail-on level');
  });

  it('writes the report to a file with --output', async () => {
    const outFile = path.join(outDir, 'report.md');
    const { code, stdout } = await runCli([siteDir, '--report', 'markdown', '--output', outFile]);
    expect(code).toBe(0);
    expect(stdout).toContain('Report written to');
    const contents = await readFile(outFile, 'utf8');
    expect(contents).toContain('# ShipCheck Report');
  });

  it('exits 1 for a missing target path', async () => {
    const { code, stderr } = await runCli([path.join(siteDir, 'does-not-exist')]);
    expect(code).toBe(1);
    expect(stderr).toContain('Path not found');
  });
}, 60_000);
