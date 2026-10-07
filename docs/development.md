# Development and verification

## Prerequisites and setup

Use Node.js 22 or later and npm. From the repository root:

```powershell
npm ci
npm run build
npm run prepare:skills
```

The prepare command downloads only commit-pinned resources in `config/external-skills.json`, checks hashes and declared adaptations, and writes `.cache/`. It may need network access. Keep source resource bytes, licenses, and provenance records together.

## Build and checks

```powershell
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
node packages/cli/dist/index.js --repo . export --target all --output ..\agent-forge-export
```

The extension-host test launches the VS Code test harness and therefore requires its runtime download when no cached host is available. The export path must be a new directory. Export writes a receipt with source commit/dirty status, catalog fingerprint, output file hashes, and per-edition coverage; it does not install files.

Run only the checks relevant to the change during development. CI builds, tests, validates, exports all editions, and compares the generated inventory and fingerprints. Test profiles are temporary. Tests must not write to real `.codex`, `.copilot`, or `.agents` profile directories.

## Making catalog changes

1. Edit the agent record in `config/roster-catalog.json` and its canonical instruction in `rosters/`.
2. Update the declared skills, model, permissions intent, evidence, or hooks in the catalog when needed. Do not duplicate catalog data in the transport manifest.
3. Run strict validation and generate all editions. Review all diagnostics, receipt hashes, and compatibility coverage.
4. For behavior changes, run the applicable package tests and extension-host checks, and distinguish automated evidence from live client observations.

Keep model and reasoning assignments intact. When a client lacks a matching model, report the gap; do not replace it silently. Preserve any third-party license and provenance material when moving or adapting resources.

## Architecture boundaries

`packages/core` owns catalog resolution, adapters, deployment planning, migration, state, and transactions. `packages/cli` is the command-line adapter; `packages/extension` is the VS Code UI adapter. Keep format conversion and filesystem effects behind these shared contracts. See [architecture](architecture.md) for the catalog and runtime design.
