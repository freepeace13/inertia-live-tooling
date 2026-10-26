# inertia-live-tooling

Release tooling shared by the Inertia Live repositories: a release script, reusable GitHub Actions workflows and a Claude Code plugin (skills, agents, hook). Consumers: `../inertia-live` (npm, lockstep packages) and `../inertia-live-laravel` (Composer).

Design: `docs/superpowers/specs/2026-10-27-release-tooling-design.md`. This file is local only: `/docs/` is gitignored in every repo (D-014), so it is not on GitHub. Its rules are mirrored in the docs repo's `release-policy.md` and in this repo's README; if the local file is missing, work from those.

## Commands

```sh
npm test    # node --test test/*.test.mjs; zero dependencies, Node >= 20
node scripts/release.mjs <patch|minor|major|rc|x.y.z> [--dir <repo>] [--branch <name>] [--date YYYY-MM-DD]
```

The script edits files only (version files, changelog) and prints `{from,to,tag,prerelease,line}` as JSON. It never commits, tags or publishes. Try it on a copy of a repo, not the real one.

## Status

Built: the release script (`scripts/release.mjs`, `scripts/lib/{version,changelog,release}.mjs`) with 24 tests. Not built yet: reusable workflows (prepare, publish, backport, prune), caller workflows, the Claude plugin. See phase 5 of the roadmap. Not tagged or released; do not push a tag until the reusable workflows exist.

## The release program

The source of truth is the docs repo, `../inertia-live-docs`: `release-policy.md`, `roadmap.md`, `decision-log.md`. A private progress tracker mirrors them: https://claude.ai/artifact/PjKwna6Tty3ZnZFKneBjhT (owner access). Change the docs first, then the tracker. If they disagree, the docs win.

## Rules for this repo

- **Keep it generic.** Nothing may hard-code `inertia-live`; behavior comes from each repo's `.release.json` (`ecosystem`, `versionFiles`, `changelog`, `tagPrefix`).
- **Zero dependencies** for the script, so reusable workflows can run it with a bare `node`.
- Test first: version math and changelog edits are pure functions with tests in `test/`. A failed release must write nothing.
- Policy changes (branch rules, dist-tags, support window) are made in the docs repo's decision log first, then implemented here.
- Consumers pin this repo by tag (`@v1`). Do not tag until the workflows exist, and never move a published tag.
- **No AI attribution** anywhere: no `Co-Authored-By` trailers, no "Generated with" footers, no mentions in commits, PRs, docs or code comments. The plugin's prompts must say the same.

## Keeping the tracker in sync

Tracker: https://claude.ai/artifact/PjKwna6Tty3ZnZFKneBjhT. Update it whenever you finish, start, block or add work, or record a decision or note, in the same piece of work. Never create a second tracker artifact.

- **State** (phases, tasks, decisions, notes) lives in the artifact's database. Use the `ArtifactData` tool with the tracker URL; pin writes to documents you have read (`if_version`). Task ids are stable slugs (`t-...`); statuses are `todo`, `doing`, `done`, `blocked`.
- **Page text or layout:** read the artifact (`Artifact` with `action: "read"` and the URL) to get its current HTML, change it, and publish with `url` set so the link stays the same.
- **Order:** docs repo first (`decision-log.md`, `roadmap.md`, `release-policy.md`), then the tracker. The docs win on conflict.
