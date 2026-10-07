# Portable Copilot skill dependencies

These ten skills are original Agent Forge implementations. They do not copy the
desktop application's bundled artifact runtime or vendor skill text. They use
public libraries, locally installed executables and authenticated MCP tools.
The dependency package is separate from the 60 roster-owned skills.

Run `node scripts/prepare-copilot-dependencies.mjs` from the repository root to
rebuild the deterministic SHA-256 inventory. `--check` verifies without writing.
Neither command installs software, invokes a model, connects to a server or
generates content. Copy each complete `skills/<id>` directory to the target
skill directory; copy `runtime` to the managed runtime's `dependencies` directory.
Replace `__COPILOT_RUNTIME__` in installed text with the managed runtime path.

`node runtime/discover.mjs` reports interpreter paths, installed Python package
versions, and optional renderers using only local version/metadata inspection.
Explicit `AGENT_FORGE_PYTHON` and `AGENT_FORGE_NODE` executable paths take precedence;
then a dedicated `runtime/dependencies/.venv`, the existing research runtime,
uv-managed interpreters and PATH. Windows Store execution aliases are excluded.
This discovery never installs a
package or executes a research notebook. User-selected binaries are trusted local
tools and are executed only for their version/metadata. Node itself is sufficient
to generate the static inventory.

For a separate portable Python environment, use Python 3.11+ and install the
listed requirements in a user-approved virtual environment. No Python package,
TeX distribution, Office application or API credential is bundled here. Packages
keep their upstream licenses; PyMuPDF has AGPL/commercial licensing, which must be
considered for redistribution. Import-based discovery does not copy libraries.

The scripts create/edit/read actual files when called for an authorized task.
No content-generation calls are part of installation verification. TeX compilation,
notebook execution and media generation occur only for subsequent requested work.
PDF renderers and Office desktop applications remain optional external engines.
MCP authentication is performed in VS Code; credentials are never imported from
another application. A configured endpoint is not evidence of authentication.

All Python scripts accept `--help`; examples in each skill use `python` as the
discovered interpreter. Paths following `scripts/` are relative to that skill.
Each create command refuses to overwrite an existing destination. Editing examples
write a new copy unless the user requests an in-place edit.
