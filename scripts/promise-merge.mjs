/**
 * Merges a promise-block JSON file into a metrics JSON file under the 'promise' key.
 *
 * Usage: node scripts/promise-merge.mjs <metricsJson> <promiseBlockJson>
 *
 * On malformed input, logs to stderr and exits 0 (non-blocking — the gate
 * result has already been captured; merge failure is advisory).
 */

import { readFileSync, writeFileSync } from 'node:fs';

export function mergePromiseBlock(metricsPath, promiseBlockPath) {
  const metricsRaw = readFileSync(metricsPath, 'utf8');
  const promiseRaw = readFileSync(promiseBlockPath, 'utf8');

  let metrics;
  try {
    metrics = JSON.parse(metricsRaw);
  } catch (e) {
    process.stderr.write(`promise-merge: metrics parse error: ${e.message}\n`);
    return;
  }

  let promise;
  try {
    promise = JSON.parse(promiseRaw);
  } catch (e) {
    process.stderr.write(`promise-merge: promise-block parse error: ${e.message}\n`);
    return;
  }

  metrics.promise = promise;
  writeFileSync(metricsPath, JSON.stringify(metrics, null, 2) + '\n');
}

// CLI entry point
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const [,, metricsPath, promiseBlockPath] = process.argv;
  if (!metricsPath || !promiseBlockPath) {
    process.stderr.write('usage: node scripts/promise-merge.mjs <metricsJson> <promiseBlockJson>\n');
    process.exit(1);
  }
  try {
    mergePromiseBlock(metricsPath, promiseBlockPath);
  } catch (e) {
    process.stderr.write(`promise-merge: ${e.message}\n`);
  }
}
