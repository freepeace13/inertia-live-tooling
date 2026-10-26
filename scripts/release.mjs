#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { prepareRelease } from './lib/release.mjs';

const USAGE = 'Usage: release.mjs <patch|minor|major|rc|x.y.z> [--dir <repo>] [--branch <name>] [--date YYYY-MM-DD]';

// Fails on a detached HEAD: the branch rules must not be skipped silently, so pass --branch there.
function currentBranch(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'symbolic-ref', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error('Cannot detect the current branch (detached HEAD?); pass --branch <name>');
  }
}

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { dir: { type: 'string', default: '.' }, branch: { type: 'string' }, date: { type: 'string' } },
  });
  if (positionals.length !== 1) throw new Error(USAGE);

  const dir = resolve(values.dir);
  const branch = values.branch ?? currentBranch(dir);
  const result = prepareRelease({ dir, bump: positionals[0], branch, ...(values.date && { date: values.date }) });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
