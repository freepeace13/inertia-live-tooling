# inertia-live-tooling

Release tooling shared by the inertia-live repositories ([`inertia-live`](https://github.com/freepeace13/inertia-live) and [`inertia-live-laravel`](https://github.com/freepeace13/inertia-live-laravel)): scripts, reusable workflows and a Claude Code plugin. Design: [docs/superpowers/specs/2026-10-27-release-tooling-design.md](docs/superpowers/specs/2026-10-27-release-tooling-design.md).

## Status

| Part | State |
|------|-------|
| Release script (`scripts/release.mjs`) | available |
| Reusable workflows (prepare, publish, backport) | planned |
| Claude plugin (skills, agent, hook) | planned |

## Release script

```sh
node scripts/release.mjs <patch|minor|major|rc|x.y.z> [--dir <repo>] [--branch <name>] [--date YYYY-MM-DD]
```

It bumps the version files and moves `## Unreleased` in the changelog under the new version. It never commits, tags or publishes. It prints `{ from, to, tag, prerelease, line }` as JSON.

Each consuming repo has a `.release.json`:

```json
{
  "ecosystem": "npm",
  "versionFiles": ["packages/core/package.json", "packages/vue/package.json", "packages/react/package.json"],
  "changelog": "CHANGELOG.md",
  "tagPrefix": "v"
}
```

For `composer`, leave `versionFiles` empty; the current version is the latest `v*` tag reachable from HEAD.

Rules: version files must agree (lockstep); on `release/M.N` only a stable patch inside that line is allowed; prereleases (`-rc.N`) do not touch the changelog; an empty or missing `## Unreleased` is an error. In CI checkouts with a detached HEAD, pass `--branch`.

## Development

```sh
npm test   # node:test, no dependencies, Node >= 20
```
