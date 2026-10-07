# Graphify for a concrete cross-module question

Use Graphify when the assigned change needs repository dependency or impact context across modules. Read the actual source before relying on a graph result. Small local changes and general questions do not require creating an index. Hooks only convey supplied metadata and evidence; they do not index, query, provision, or launch Graphify.

## Installed commands

The installed direction skill includes `scripts/graphify-client.cjs` and a descriptor for the managed runtime. Resolve the script relative to this skill, keep the project absolute, and pass arguments separately. A global CLI is not required. The following are command shapes; replace bracketed values with observed paths and the actual question:

```text
node <skill-directory>/scripts/graphify-client.cjs status --project <absolute-project-directory>
node <skill-directory>/scripts/graphify-client.cjs index --project <absolute-project-directory>
node <skill-directory>/scripts/graphify-client.cjs query --project <absolute-project-directory> --text <question> --budget <1-to-8000>
node <skill-directory>/scripts/graphify-client.cjs affected --project <absolute-project-directory> --text <relative-file> --depth <1-to-8>
node <skill-directory>/scripts/graphify-client.cjs path --project <absolute-project-directory> --text <origin-symbol> --target <target-symbol>
node <skill-directory>/scripts/graphify-client.cjs explain --project <absolute-project-directory> --text <symbol>
```

The wrapper returns JSON. Index/status and query/affected/path/explain accept repeatable `--include <relative-glob>` and `--exclude <relative-glob>` flags; reuse the same scope when querying an index built with them. `--timeout-ms` bounds execution when needed. The repository CLI exposes the same operations under `agent-forge graphify`; use its help to confirm availability in the installed version.

## Source validation and evidence

Inspect status before using the index. A fresh status requires the current project's validated metadata; a timestamp alone does not establish freshness. The recorded repository path must match the canonical project for this session. Treat stale, missing, invalid, unavailable, and failed results explicitly, retaining the reason/error and metadata only when actually returned.

Choose one operation for the question: query for a concept, affected for a changed file's connections, path for a possible relationship between symbols, or explain for a symbol's context. Read relevant referenced files and check current imports, calls, and ownership before drawing an impact conclusion. A possible dependency is not proof of runtime reachability; a missing edge does not prove no effect. Do not upload source or start an external service to obtain a result.

If building an index is necessary for the authorized cross-module analysis and the configured runtime is available, run the scoped index command and inspect its actual result. Do not provision a missing runtime during a product session. Continue with `rg`, file inspection, and existing repository tools when Graphify is unavailable; record that limit without inventing graph evidence.

Supply the observed Graphify status in the primary session's context when useful. A specialist's evidence records `used`, `unavailable`, `failed`, or `not-used` and repository-relative source paths actually consulted. The primary agent verifies and integrates that evidence. Neither a graph nor a hook changes permissions, requirements, or the user's authorization.
