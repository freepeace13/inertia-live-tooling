import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertBranchAllows, bump, format, parse } from '../scripts/lib/version.mjs';

test('parse and format round-trip', () => {
  for (const v of ['0.1.1', '1.0.0', '0.2.0-rc.3']) assert.equal(format(parse(v)), v);
});

test('parse rejects junk', () => {
  for (const v of ['1', '1.2', 'v1.2.3', '1.2.3-beta.1', '1.2.3-rc']) {
    assert.throws(() => parse(v), /invalid version/i, v);
  }
});

test('patch / minor / major from stable', () => {
  assert.equal(bump('0.1.1', 'patch'), '0.1.2');
  assert.equal(bump('0.1.1', 'minor'), '0.2.0');
  assert.equal(bump('0.1.1', 'major'), '1.0.0');
});

test('rc from stable starts the next minor, then increments', () => {
  assert.equal(bump('0.1.1', 'rc'), '0.2.0-rc.1');
  assert.equal(bump('0.2.0-rc.1', 'rc'), '0.2.0-rc.2');
});

test('bumps graduate a prerelease when the target matches', () => {
  assert.equal(bump('0.2.0-rc.2', 'minor'), '0.2.0');
  assert.equal(bump('0.2.0-rc.2', 'patch'), '0.2.0');
  assert.equal(bump('1.0.0-rc.1', 'major'), '1.0.0');
  assert.equal(bump('0.2.1-rc.1', 'minor'), '0.3.0');
});

test('explicit versions are accepted, must be higher', () => {
  assert.equal(bump('0.1.1', '0.4.0'), '0.4.0');
  assert.equal(bump('0.1.1', '0.2.0-rc.1'), '0.2.0-rc.1');
  assert.throws(() => bump('0.1.1', '0.1.1'), /not higher/);
  assert.throws(() => bump('0.2.0', '0.1.9'), /not higher/);
  assert.throws(() => bump('0.2.0-rc.1', '0.2.0-rc.1'), /not higher/);
  assert.equal(bump('0.2.0-rc.1', '0.2.0'), '0.2.0');
});

test('unknown bump is an error', () => {
  assert.throws(() => bump('0.1.1', 'banana'), /invalid version|unknown bump/i);
});

test('branches: main and unrelated branches allow anything', () => {
  assertBranchAllows('main', '0.1.1', '0.2.0');
  assertBranchAllows('feature/x', '0.1.1', '0.2.0');
});

test('release/M.N allows only a stable patch inside the line', () => {
  assertBranchAllows('release/0.1', '0.1.1', '0.1.2');
  assert.throws(() => assertBranchAllows('release/0.1', '0.1.1', '0.2.0'), /release\/0\.1/);
  assert.throws(() => assertBranchAllows('release/0.1', '0.1.1', '0.1.2-rc.1'), /stable/);
  assert.throws(() => assertBranchAllows('release/0.1', '0.2.0', '0.2.1'), /line/);
});

test('release/M.x allows patch and minor inside the major', () => {
  assertBranchAllows('release/1.x', '1.2.0', '1.2.1');
  assert.throws(() => assertBranchAllows('release/1.x', '1.2.0', '2.0.0'), /release\/1\.x/);
});
