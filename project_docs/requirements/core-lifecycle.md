# Core Lifecycle Requirements

## Validate

`validateRoster(repo, { target })` validates manifest v3, all 24 canonical agents, the selected runtime contract, skill structure, instructions, delegation depth, Codex sandbox policy, TOML rendering, bundle references, and discoverable duplicates. Error diagnostics block planning or apply.

Duplicate discovery covers Copilot user targets and collision ownership, workspace discovery settings, `.github/agents`, `.claude/agents`, legacy VS Code prompts, project `.codex/agents`, repository-chain `.agents/skills`, and legacy/personal `.codex/skills`. The same stable ID in Copilot and Codex is valid.

## Discover

`discoverRuntimeEnvironment(target)` routes to VS Code or Codex discovery. VS Code verifies 1.104+ and exact tool/model inventories. Codex resolves `CODEX_HOME` or `~/.codex`, the `~/.agents/skills` target, and integration readiness without modifying configuration.

## Preview

`createDeploymentPlan(repo, { target })` renders the exact selected artifacts, records source commit and hashes, detects collisions and modified managed targets, and includes stale managed cleanup actions. `saveDeploymentPlan()` stores rendered bytes. Apply consumes that stored plan; it does not regenerate.

`createCleanupPlan()` contains only unchanged, stale, ledger-owned paths. Unmanaged duplicates are diagnostics, never cleanup actions.

## Deploy

`applyDeploymentPlan()`:

1. rejects any error diagnostic;
2. preflights every runtime and every cleanup action;
3. backs up all touched paths under the deployment ID;
4. writes sibling temporary files and renames them;
5. removes stale managed files only after hash verification;
6. rolls back all earlier runtime changes on failure;
7. writes state v2 only after the grouped transaction succeeds.

## State migration

State v1 is inferred as VS Code only when every owned path is under `.copilot`. Any ambiguous path fails with `AF012`. The v1 ledger is copied to `state.v1.backup.json` before state v2 is persisted.

State v2 tracks independent active deployments for `vscode` and `codex`, runtime-tagged artifacts, exact deployed hashes, source commit, and backups.

## Status, rollback, cleanup, and wipe

`getDeploymentStatus(repo, { target })` reports each runtime independently.

`rollbackDeployment(state, runtime, id)` restores the prior version for that runtime and restores stale files removed by the selected deployment. Modified current files are preserved.

`applyCleanupPlan()` applies only an exact immutable cleanup plan and updates the active ledger. `removeManagedDeployment(state, runtime)` removes/restores only unchanged managed files. Neither operation deletes unmanaged content.

## Approval boundaries

El protocolo documentado de Agent Forge exige confirmar el identificador del plan inmutable para instalación y limpieza, y el identificador de la instalación activa para eliminación administrada y recuperación desde la extensión. El protocolo del producto no incluye una opción o configuración de confirmación automática. Antes de ejecutar operaciones de producción, nube, lanzamiento, publicación remota, instalación de proveedores, descarga u operaciones destructivas, el asistente debe comprobar que la autorización vigente cubre la acción, sus efectos y su destino. Si ya existe autorización suficiente, no debe solicitarla de nuevo. Debe respetar el protocolo real de la herramienta y, cuando éste exija una interacción humana que no pueda realizar, solicitar sólo esa interacción para la operación autorizada. Un encargo de mantenimiento del programa no equivale a autorizar estas operaciones sobre un perfil real.
