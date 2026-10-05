# Graphify local code integration

Date: 2026-10-02. Scope: the shared core, its own Python launchers, dependency records, and tests in a temporary managed directory. Deployment into the real Codex profile and observations in Desktop and VS Code belong to the main installation report.

## Selected implementation and sources

The integration uses `graphifyy==0.9.74`, discovered through the [Graphify entry on skills.sh](https://www.skills.sh/graphify-labs/graphify/graphify), and reviewed against [Graphify's source at revision e10df08877f8819a625a1afa38c3297a31fda296](https://github.com/Graphify-Labs/graphify/tree/e10df08877f8819a625a1afa38c3297a31fda296) and the [published package](https://pypi.org/project/graphifyy/0.9.74/). The selected wheel SHA-256 is `7d7f2475be6f3dd5723743989d1a5a02f323f715ff6938cff999f3014cde41c5`. Upstream attribution and license files remain inside the unchanged wheel and installed distribution; the source distribution includes Apache-2.0 terms and its retained historical attribution.

Only the local command-line package is used. Agent Forge does not run `graphify install`, install the upstream skill, start its servers, register an MCP server, or copy its hooks. Its own hooks only consume index metadata when present. Indexing requires an explicit Agent Forge command or a software-product task authorized to use that command.

Extraction invokes the private Python interpreter with the following arguments, passed as an array without a shell:

```text
-I -B <own-runner> <private-runtime> <generation> extract <selected-source>
--code-only --no-cluster --max-workers 1 --out <generation>
```

The runner permits only `extract`, `query`, `affected`, `path`, and `explain`. In the reviewed release, these selected queries use the existing structural graph. The adapter does not enable semantic extraction, embeddings, model providers, document processing, Google Workspace access, or automatic instruction refresh. A new generation is used for changed inputs and for an explicit rebuild; an earlier graph is never supplied to extraction, because upstream `--code-only` by itself can retain a pre-existing semantic layer.

## Reproducible provisioning

`config/graphify-windows-x64-python312.lock.json` is the executable installation input. It records 31 exact wheel filenames, versions, official PyPI download URLs, sizes, and SHA-256 hashes. `graphify-windows-x64-python312.requirements.txt` records the binary-only dependency resolution used to prepare this selection. `scripts/graphify/record_lock.mjs` verifies the downloaded wheel bytes against published PyPI metadata; it is a maintainer tool, not part of deployment.

The selected platform is Windows x64 with Python 3.12.13. Preview probes the actual interpreter, records its version, freezes 782 distribution files in the observed installation, and freezes both Agent Forge launchers and all wheels. It excludes the source interpreter's installed packages, launchers, development resources and its installation-specific `EXTERNALLY-MANAGED` marker. The source interpreter is never modified. Application builds an independent copy and checks its resulting prefix and package versions. The resulting active runtime does not depend on the source interpreter remaining installed.

Preview stores resolved bytes under `blobs/<sha256>` rather than downloading again during application. The plan includes the exact active `runtime.json` preimage. Applying it checks the saved plan, all frozen bytes, and the active preimage before creating a new runtime. Pip is bootstrapped from its frozen wheel using `--isolated --no-index --no-cache-dir --no-deps --no-compile --require-hashes --only-binary=:all:`. No source distributions or package build scripts are used.

The active `runtime.json` changes only after installation, interpreter checks and inventory hashing succeed. Failed installations retain a diagnostic directory and preserve the prior active pointer. Restore requires the currently active runtime to match the requested plan and verifies the runtime before restoring its predecessor. It preserves immutable resources and indexes for recovery.

## Public core interface and locations

The exported entry point is `packages/core/src/graphify.ts`.

| Operation | Contract |
| --- | --- |
| `createGraphifyProvisionPlan(options)` | `managedRoot`, `pythonPath`, `lockPath`; optional `downloadMissing`, `wheelCachePath`, `helperDirectory`, `signal`. Freezes bytes and saves the plan. |
| `saveGraphifyProvisionPlan(plan)` / `loadGraphifyProvisionPlan(root, id)` | Save or load an immutable plan by its SHA-256 identifier. |
| `validateGraphifyProvisionPlan(plan)` | Validate the plan structure and its digest synchronously. |
| `verifyGraphifyProvisionPlan(plan)` | Also verify the saved preview and every frozen byte dependency. |
| `applyGraphifyProvisionPlan(plan, { signal }?)` | Apply frozen bytes without network resolution and return `GraphifyRuntime`. |
| `loadGraphifyRuntime(root)` / `verifyGraphifyRuntime(runtime, { signal }?)` | Read the active receipt or verify the full private file inventory. |
| `restoreGraphifyRuntime(root, planId)` | Restore only the active runtime installed by this plan. |
| `selectGraphifyFiles(repositoryPath, scope?)` | Return eligible paths, hashes, exclusions and scope/content identifiers, without source text. |
| `graphifyProjectDirectory(root, repositoryPath)` | Return the canonical repository path, project identifier and managed project directory. |
| `buildGraphifyIndex(options)` | Require `runtime`, `repositoryPath`; accept `include`, `exclude`, `rebuild`, `signal`, `timeoutMs`. Reuse only an unchanged generation, otherwise publish a complete new generation. |
| `getGraphifyStatus(options)` | Return `missing`, `fresh`, `stale` or `invalid`; hashes source files and graph bytes, but does not invoke Python. |
| `queryGraphify(options)` | Accept the index options plus `operation`, `text`, optional `target`, `depth`, `budget`; require a current index and return output and metadata. |

The complete managed layout is:

```text
<managedRoot>/runtime.json
<managedRoot>/blobs/<sha256>
<managedRoot>/plans/<planId>/plan.json
<managedRoot>/runtimes/<planId>/{python,helpers,wheels,home,runtime.json}
<managedRoot>/projects/<projectId>/status.json
<managedRoot>/projects/<projectId>/generations/<generationId>/selection.json
<managedRoot>/projects/<projectId>/generations/<generationId>/source/
<managedRoot>/projects/<projectId>/generations/<generationId>/graphify-out/graph.json
<managedRoot>/projects/<projectId>/generations/<generationId>/index.json
```

`projectId` hashes the canonical repository/worktree path. `contentHash` hashes selected relative paths, byte hashes, sizes and the scope policy. `generationId` combines a content-hash prefix and a unique identifier, so rebuild cannot reuse upstream caches. `status.json` contains schema version, repository path, project/runtime/generation/content/scope identifiers, graph path/hash, timestamp and file/exclusion/node/edge counts. It contains no source text or credentials. Hooks may read this metadata as context; it is not evidence of freshness until the command verifies the current files.

## File and process boundaries

Selection respects Git ignore rules when `.git` exists, explicit include/exclude patterns, known dependency/output/cache directories, known secret filenames, known credential patterns in source text, binary content, and the code extension/manifest allowlist. It rejects path traversal and encountered symbolic links or Windows junctions. Each selected file is checked again while copying; the source selection is hashed again before publishing. File, count and output limits fail explicitly instead of silently truncating the selected graph.

The child receives a newly constructed environment and private home/temp directories. Provider credentials and inherited Python search paths are absent. `GRAPHIFY_NO_AUTO_REFRESH=1`, `GRAPHIFY_GOOGLE_WORKSPACE=0`, and `GRAPHIFY_QUERY_LOG_DISABLE=1` are explicit. Python runs with isolated mode and bytecode writes disabled. The selected snapshot contains an empty `.git` marker to stop upstream traversal for ancestor ignore files; the original Git metadata, configuration and hooks are never copied. The runner converts absolute Windows command arguments into extended-length paths to support upstream AST cache filenames beyond the legacy path limit.

The Python audit hook rejects socket connection, binding and name resolution, external subprocess creation, and audited file access outside the private runtime and selected generation. This is a tested Python boundary, **not operating-system network isolation**. Native extensions can bypass Python auditing; no firewall guarantee is claimed. Known secret patterns reduce exposure but do not detect every possible credential embedded in source code. Retained generations contain copies of selected source code and must be treated as private repository data. Restore does not delete that recoverable data automatically.

Per-runtime and per-project locks reject concurrent writers. Cancellation and time limits stop the child process, and incomplete work does not replace the active index. An abruptly terminated host can leave a lock; its recorded process and timestamp must be inspected before removing the lock. The code does not automatically take over a potentially active operation.

## Observed verification

The temporary managed root was `D:/Repositorios/agent-forge/.cache/graphify/test-managed`; no real Codex profile was changed by this implementation work. Final private runtime and plan: `34df81597b21da192cb5d1deebe9f62b54353aff5319f9f0c56a9ec7425ddf26`. Its receipt records Python 3.12.13, Graphify 0.9.74 and 3,542 immutable runtime files. The helper frozen in this plan includes extended Windows path support.

| Check | Observed result |
| --- | --- |
| `npm.cmd run build -w packages/core` | Passed with the existing TypeScript/dependency versions. |
| `node.exe --test packages/core/test/graphify.test.mjs` | 12 tests passed: environment, selection, secrets, scope/content changes, Git ignores and unavailable Git, traversal/junction rejection, concurrency, cancellation during inventory and process limits, immutable plans and blobs, preimage drift, recovery and missing-index behavior. |
| `selectGraphifyFiles` on the actual Agent Forge checkout | Completed with 118 eligible files and 944 exclusion records at the observed revision. Git failure was not silently treated as permission to ignore repository rules. These counts are descriptive, not fixed requirements. |
| Private runtime provisioning | Completed from frozen bytes. Earlier attempts exposed the source Python marker, Windows pip bootstrap identity, and long AST-cache paths; each was corrected and a fresh plan was created. |
| Windows extraction with long generation/cache paths | Two Python source files produced four nodes and five relationships with zero documents, papers or images selected. |
| `AGENT_FORGE_GRAPHIFY_REAL_RUNTIME=<temporary managed root> node.exe --test packages/core/test/graphify-real.test.mjs` | 2 tests passed on Windows in 424.24 seconds: the complete structural-query/index lifecycle and all three intentionally denied audited operations. |

The real-runtime regression uses a synthetic two-file Python product fragment plus excluded `.env` and Markdown files. It exercises extraction, unchanged-generation reuse, all four query operations, stale-source rejection, timeout preservation, changed-source publication, explicit rebuild and runtime integrity. A separate check intentionally requests a local socket connection, a child process and an outside-file read and requires `PermissionError` for each. This evidence demonstrates the tested local behavior; it does not establish correctness for every upstream parser or every possible application.

After that full run started, cancellation checks were propagated into runtime inventory traversal and source selection, and unavailable Git was separated from absent Git metadata. These changes were compiled and covered by the focused unit regressions; the seven-minute real-runtime regression was not restarted for those independent checks. No frozen Python helper changed after the final runtime was provisioned.

The runtime lock currently supports only Windows x64/Python 3.12.13. Other interpreter versions and platforms require their own reviewed dependency record and observed execution. In this Codex sandbox, resolving the ancestor `C:/Users/rober` can return `EPERM` even for readable descendants; application in a user-profile directory needs the authorized execution context used by the main installer. The path checks are not bypassed to conceal that limitation.

## Installation with the Codex agents and guides

The repository CLI exposes the shared implementation through `agent-forge graphify`. `provision-preview` freezes the private interpreter, wheels and helpers. A Codex deployment preview accepts `--graphify-plan <exact-provision-plan-id>` and records that plan alongside the exact agent, guide and hook bytes. Applying the Codex plan verifies all frozen dependencies, installs the runtime and records ownership of its active pointer in the same deployment receipt. It does not resolve newer package versions.

The installed direction skill carries a portable Node client and five compiled modules. Its descriptor fixes the managed root and runtime identifier; a preview using an existing runtime also fixes the receipt hash. The client validates the runtime inventory before use and rejects a missing or different runtime. It cannot provision or replace Python. The same command dispatch is used by the repository CLI and the installed client, without requiring a global Agent Forge installation.

When the Codex deployment provisioned Graphify, rollback restores the previous pointer recorded in that immutable provision plan and preserves runtime versions and indexes. A runtime provisioned independently is only referenced by the Codex plan: rolling back that Codex deployment does not undo another transaction's runtime. An unrelated or modified runtime is preserved and reported.

A real combined-transaction test provisioned a disposable Windows runtime from the reviewed files, then forced a later managed-file write to fail. Application returned failure, restored the previously absent Graphify pointer, preserved the existing file and did not publish deployment state. All three tests in that run passed in 187.56 seconds. This demonstrates a handled write failure; it does not simulate loss of power or an operating-system crash. The ordinary test run skips this expensive opt-in case and reuses its recorded result unless changes give a reason to repeat it.
