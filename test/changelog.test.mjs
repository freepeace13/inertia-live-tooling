import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promoteUnreleased } from '../scripts/lib/changelog.mjs';

const head = '# Changelog\n\nIntro.\n\n';

test('moves Unreleased under the new version and leaves an empty Unreleased', () => {
  const src = `${head}## Unreleased\n\n### Fixed\n- A thing.\n\n## 0.1.0 - 2026-10-07\n\n- Old.\n`;
  const out = promoteUnreleased(src, '0.1.1', '2026-10-27');
  assert.equal(
    out,
    `${head}## Unreleased\n\n## 0.1.1 - 2026-10-27\n\n### Fixed\n- A thing.\n\n## 0.1.0 - 2026-10-07\n\n- Old.\n`,
  );
});

test('works when Unreleased is the last section, with or without trailing newline', () => {
  const a = promoteUnreleased(`${head}## Unreleased\n\n- X.\n`, '0.2.0', '2026-01-01');
  assert.equal(a, `${head}## Unreleased\n\n## 0.2.0 - 2026-01-01\n\n- X.\n`);
  const b = promoteUnreleased(`${head}## Unreleased\n\n- X.`, '0.2.0', '2026-01-01');
  assert.equal(b, `${head}## Unreleased\n\n## 0.2.0 - 2026-01-01\n\n- X.\n`);
});

test('missing Unreleased is an error', () => {
  assert.throws(() => promoteUnreleased(`${head}## 0.1.0 - 2026-10-07\n\n- Old.\n`, '0.1.1', 'd'), /no .*Unreleased/i);
});

test('empty Unreleased is an error', () => {
  assert.throws(
    () => promoteUnreleased(`${head}## Unreleased\n\n## 0.1.0 - 2026-10-07\n\n- Old.\n`, '0.1.1', 'd'),
    /empty/i,
  );
});

test('does not match a heading that merely starts with Unreleased', () => {
  assert.throws(() => promoteUnreleased(`${head}## Unreleased notes\n\n- X.\n`, '0.1.1', 'd'), /no .*Unreleased/i);
});
