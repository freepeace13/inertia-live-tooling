import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promoteUnreleased } from './changelog.mjs';
import { assertBranchAllows, bump, line, parse } from './version.mjs';

const VERSION_FIELD = /^(\s*"version"\s*:\s*)"[^"]*"/m;

function loadConfig(dir) {
  const file = join(dir, '.release.json');
  if (!existsSync(file)) throw new Error(`No .release.json in ${dir}`);
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (!['npm', 'composer'].includes(config.ecosystem)) {
    throw new Error(`.release.json: unknown ecosystem "${config.ecosystem}" (use npm or composer)`);
  }
  if (typeof config.changelog !== 'string') throw new Error('.release.json: "changelog" is required');
  config.versionFiles ??= [];
  config.tagPrefix ??= 'v';
  if (config.ecosystem === 'npm' && config.versionFiles.length === 0) {
    throw new Error('.release.json: npm needs a non-empty "versionFiles"');
  }
  return config;
}

function currentVersion(dir, config) {
  if (config.ecosystem === 'composer') {
    let tag;
    try {
      tag = execFileSync('git', ['-C', dir, 'describe', '--tags', '--abbrev=0', '--match', `${config.tagPrefix}*`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      throw new Error(`No ${config.tagPrefix}* tag reachable from HEAD to take the current version from`);
    }
    return tag.slice(config.tagPrefix.length);
  }

  const versions = config.versionFiles.map((f) => {
    const m = VERSION_FIELD.exec(readFileSync(join(dir, f), 'utf8'));
    if (!m) throw new Error(`No "version" field in ${f}`);
    return [f, m[0].match(/"([^"]*)"$/)[1]];
  });
  const distinct = new Set(versions.map(([, v]) => v));
  if (distinct.size > 1) {
    const detail = versions.map(([f, v]) => `${f}=${v}`).join(', ');
    throw new Error(`Version files disagree (lockstep): ${detail}`);
  }
  return versions[0][1];
}

export function prepareRelease({ dir, bump: kind, branch, date = new Date().toISOString().slice(0, 10) }) {
  const config = loadConfig(dir);
  const from = currentVersion(dir, config);
  parse(from);
  const to = bump(from, kind);
  assertBranchAllows(branch, from, to);

  const prerelease = parse(to).rc !== null;
  const changelogPath = join(dir, config.changelog);

  // Compute every write first so a failure leaves the working tree untouched.
  const writes = config.versionFiles.map((f) => {
    const p = join(dir, f);
    return [p, readFileSync(p, 'utf8').replace(VERSION_FIELD, `$1"${to}"`)];
  });
  if (!prerelease) writes.push([changelogPath, promoteUnreleased(readFileSync(changelogPath, 'utf8'), to, date)]);
  for (const [p, content] of writes) writeFileSync(p, content);

  return { from, to, tag: `${config.tagPrefix}${to}`, prerelease, line: line(to) };
}
