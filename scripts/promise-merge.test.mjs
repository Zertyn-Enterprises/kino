/**
 * Tests for promise-merge.mjs — merges promise-block.json into metrics.json.
 *
 * Covers:
 *   - Positive merge: promise block written under 'promise' key; existing metrics
 *     fields preserved; output is valid JSON ending with newline.
 *   - Malformed metrics JSON: logs to stderr, does not throw, does not write.
 *   - Malformed promise-block JSON: logs to stderr, does not throw, does not write.
 */

import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mergePromiseBlock } from './promise-merge.mjs';

function makeTmp() {
  return mkdtempSync(join(tmpdir(), 'promise-merge-test-'));
}

// ---------------------------------------------------------------------------
// Positive merge
// ---------------------------------------------------------------------------

describe('mergePromiseBlock — positive', () => {
  it('writes promise block under promise key and preserves existing fields', () => {
    const dir = makeTmp();
    const metricsPath = join(dir, 'metrics.json');
    const promisePath = join(dir, 'promise-block.json');

    const metrics = { gate1: true, gate2: false };
    const promise = { hardGatesPass: true, wordCount: { pass: true, value: 4 } };

    writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    writeFileSync(promisePath, JSON.stringify(promise, null, 2));

    mergePromiseBlock(metricsPath, promisePath);

    const result = JSON.parse(readFileSync(metricsPath, 'utf8'));
    expect(result.gate1).toBe(true);
    expect(result.gate2).toBe(false);
    expect(result.promise).toEqual(promise);
  });

  it('output ends with a trailing newline', () => {
    const dir = makeTmp();
    const metricsPath = join(dir, 'metrics.json');
    const promisePath = join(dir, 'promise-block.json');

    writeFileSync(metricsPath, JSON.stringify({ x: 1 }));
    writeFileSync(promisePath, JSON.stringify({ hardGatesPass: true }));

    mergePromiseBlock(metricsPath, promisePath);

    const raw = readFileSync(metricsPath, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Malformed-input tolerance
// ---------------------------------------------------------------------------

describe('mergePromiseBlock — malformed input', () => {
  it('tolerates malformed metrics JSON — does not throw', () => {
    const dir = makeTmp();
    const metricsPath = join(dir, 'metrics.json');
    const promisePath = join(dir, 'promise-block.json');

    writeFileSync(metricsPath, '{bad json');
    writeFileSync(promisePath, JSON.stringify({ hardGatesPass: true }));

    // Must not throw
    expect(() => mergePromiseBlock(metricsPath, promisePath)).not.toThrow();
    // File left unchanged (original malformed content)
    expect(readFileSync(metricsPath, 'utf8')).toBe('{bad json');
  });

  it('tolerates malformed promise-block JSON — does not throw', () => {
    const dir = makeTmp();
    const metricsPath = join(dir, 'metrics.json');
    const promisePath = join(dir, 'promise-block.json');

    const original = JSON.stringify({ gate1: true });
    writeFileSync(metricsPath, original);
    writeFileSync(promisePath, '{bad json');

    expect(() => mergePromiseBlock(metricsPath, promisePath)).not.toThrow();
    // metrics.json left unchanged when promise parse fails
    expect(readFileSync(metricsPath, 'utf8')).toBe(original);
  });
});
