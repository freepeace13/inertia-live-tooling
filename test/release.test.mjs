import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { prepareRelease } from '../scripts/lib/release.mjs';

const CHANGELOG = '# Changelog\n\n## Unreleased\n\n- Fix.\n\n## 0.1.0 - 2026-10-07\n\n- Old.\n';

function pkg(name, version) {
  return `{\n  "name": "${name}",\n  "version": "${version}",\n  "dependencies": {\n    "x": "1.0.0"\n  }\n}\n`;
}

function npmRepo({ versions = ['0.1.1', '0.1.1'], changelog = CHANGELOG, config = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rel-'));
  mkdirSync(join(dir, 'packages/a'), { recursive: true });
  mkdirSync(join(dir, 'packages/b'), { recursive: true });
  writeFileSync(join(dir, 'packages/a/package.json'), pkg('a', versions[0]));
  writeFileSync(join(dir, 'packages/b/package.json'), pkg('b', versions[1]));
  writeFileSync(join(dir, 'CHANGELOG.md'), changelog);
  writeFileSync(
    join(dir, '.release.json'),
    JSON.stringify({
      ecosystem: 'npm',
      versionFiles: ['packages/a/package.json', 'packages/b/package.json'],
      changelog: 'CHANGELOG.md',
      ...config,
    }),
  );
  return dir;
}

const read = (dir, f) => readFileSync(join(dir, f), 'utf8');

test('npm: bumps every version file, preserves formatting, promotes the changelog', () => {
  const dir = npmRepo();
  const r = prepareRelease({ dir, bump: 'patch', branch: 'main', date: '2026-10-27' });
  assert.deepEqual(r, { from: '0.1.1', to: '0.1.2', tag: 'v0.1.2', prerelease: false, line: '0.1' });
  assert.equal(read(dir, 'packages/a/package.json'), pkg('a', '0.1.2'));
  assert.equal(read(dir, 'packages/b/package.json'), pkg('b', '0.1.2'));
  assert.match(read(dir, 'CHANGELOG.md'), /## Unreleased\n\n## 0\.1\.2 - 2026-10-27\n\n- Fix\./);
});

test('npm: prerelease bumps files, leaves the changelog alone', () => {
  const dir = npmRepo();
  const r = prepareRelease({ dir, bump: 'rc', branch: 'main', date: '2026-10-27' });
  assert.equal(r.to, '0.2.0-rc.1');
  assert.equal(r.prerelease, true);
  assert.equal(r.line, '0.2');
  assert.equal(read(dir, 'CHANGELOG.md'), CHANGELOG);
});

test('npm: lockstep violation fails and changes nothing', () => {
  const dir = npmRepo({ versions: ['0.1.1', '0.1.0'] });
  assert.throws(() => prepareRelease({ dir, bump: 'patch', branch: 'main', date: 'd' }), /lockstep|disagree/i);
  assert.equal(read(dir, 'packages/a/package.json'), pkg('a', '0.1.1'));
  assert.equal(read(dir, 'CHANGELOG.md'), CHANGELOG);
});

test('empty Unreleased fails before any file is written', () => {
  const dir = npmRepo({ changelog: '# Changelog\n\n## Unreleased\n\n## 0.1.0 - 2026-10-07\n\n- Old.\n' });
  assert.throws(() => prepareRelease({ dir, bump: 'patch', branch: 'main', date: 'd' }), /empty/i);
  assert.equal(read(dir, 'packages/a/package.json'), pkg('a', '0.1.1'));
});

test('release branch rejects a minor bump and writes nothing', () => {
  const dir = npmRepo();
  assert.throws(() => prepareRelease({ dir, bump: 'minor', branch: 'release/0.1', date: 'd' }), /release\/0\.1/);
  assert.equal(read(dir, 'packages/a/package.json'), pkg('a', '0.1.1'));
});

test('release branch allows a patch', () => {
  const dir = npmRepo();
  assert.equal(prepareRelease({ dir, bump: 'patch', branch: 'release/0.1', date: 'd' }).to, '0.1.2');
});

test('config: unknown ecosystem, missing config, empty npm versionFiles', () => {
  assert.throws(() => prepareRelease({ dir: npmRepo({ config: { ecosystem: 'gem' } }), bump: 'patch', branch: 'main' }), /ecosystem/);
  assert.throws(() => prepareRelease({ dir: mkdtempSync(join(tmpdir(), 'rel-')), bump: 'patch', branch: 'main' }), /\.release\.json/);
  assert.throws(
    () => prepareRelease({ dir: npmRepo({ config: { versionFiles: [] } }), bump: 'patch', branch: 'main' }),
    /versionFiles/,
  );
});

test('composer: current version comes from the latest tag, only the changelog changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rel-'));
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  writeFileSync(join(dir, 'CHANGELOG.md'), CHANGELOG);
  writeFileSync(join(dir, '.release.json'), JSON.stringify({ ecosystem: 'composer', versionFiles: [], changelog: 'CHANGELOG.md' }));
  git('add', '.');
  git('commit', '-q', '-m', 'init');
  git('tag', 'v0.1.0');
  const r = prepareRelease({ dir, bump: 'patch', branch: 'main', date: '2026-10-27' });
  assert.equal(r.from, '0.1.0');
  assert.equal(r.to, '0.1.1');
  assert.match(read(dir, 'CHANGELOG.md'), /## 0\.1\.1 - 2026-10-27/);
});

test('composer without any tag is an error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rel-'));
  execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main']);
  writeFileSync(join(dir, 'CHANGELOG.md'), CHANGELOG);
  writeFileSync(join(dir, '.release.json'), JSON.stringify({ ecosystem: 'composer', versionFiles: [], changelog: 'CHANGELOG.md' }));
  assert.throws(() => prepareRelease({ dir, bump: 'patch', branch: 'main' }), /tag/i);
});
