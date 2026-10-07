# Installation and recovery

## Generate artifacts

Generation is separate from installation. This command produces Codex, Copilot, and OpenCode editions from the same catalog in a new directory and makes no profile changes:

```powershell
node packages/cli/dist/index.js --repo . export --target all --output ..\agent-forge-export
```

Use `--target codex`, `--target vscode`, or `--target opencode` for one edition. To prepare missing pinned skills during export, add `--download-skills`. OpenCode is an artifact only; installation is not part of this project.

## Migrate existing ownership

Existing deployments may have separate Agent Forge ownership ledgers. Migration previews an immutable, recoverable transfer into the shared ledger. It imports known package ledgers by default and archives no historical files unless an exact absolute-path JSON list is supplied with `--archive-list`.

```powershell
node packages/cli/dist/index.js --repo . migrate-rosters preview --json
```

Review the listed ledgers, files, hook groups, archive paths, hashes, backup location, `planId`, and fingerprint. For reviewed historical Copilot files, prepare the explicit path list, then create a new preview with `--archive-list RUTA_ABSOLUTA_JSON`. Applying the preview backs up source bytes, transfers ownership, and records migration markers that disable legacy installers:

```powershell
node packages/cli/dist/index.js --repo . migrate-rosters apply --plan ID_PLAN --confirm ID_PLAN
```

The two IDs must match the reviewed preview. If migration fails or needs recovery, restore the same saved plan:

```powershell
node packages/cli/dist/index.js --repo . migrate-rosters restore --plan ID_PLAN --confirm ID_PLAN
```

Migration preserves existing installed files and hook contents; it does not deploy a new edition. Keep the persistent migration backup and plan until the later deployment is verified. If a deployment has already followed migration, roll it back before restoring migration.

## Deploy Codex and Copilot

First prepare resources, build the CLI, and discover exact client capabilities. Then create and inspect a plan:

```powershell
npm run build
npm run prepare:skills
node packages/cli/dist/index.js --repo . doctor --target all --profile full
node packages/cli/dist/index.js --repo . preview --target all --scope user --profile full --download-skills --json
```

Preview persists a plan under the configured Agent Forge state directory. Review its diagnostics and every target and cleanup action. Apply only that plan by repeating its exact ID:

```powershell
node packages/cli/dist/index.js --repo . deploy --target all --plan ID_PLAN --confirm ID_PLAN
node packages/cli/dist/index.js --repo . status --target all --json
```

The `all` deployment target covers Codex and VS Code Copilot. Codex edition artifacts serve both Codex Desktop and the Codex extension for VS Code. The plan protocol checks ownership, file hashes, and collisions; deployment does not install OpenCode.

## Roll back or clean up

Roll back a deployment by its recorded ID:

```powershell
node packages/cli/dist/index.js --repo . rollback --target codex --deployment ID_DESPLIEGUE
```

Substitute `vscode` for a Copilot deployment. Agent Forge verifies managed hashes and ownership and preserves modified or foreign files. For cleanup, generate and inspect a managed-only cleanup plan, then apply its exact plan ID as documented by `agent-forge cleanup --help`. Do not manually delete profile files or hook groups managed by Agent Forge.

## Hook trust and live checks

After deployment, start new client sessions and inspect the discovered agents, skills, and hook registrations. Codex may require native trust review for changed hooks. Copilot's nested invocation behavior depends on the selected engine and its settings. Generated coverage distinguishes what the adapter can map from behavior observed in a live client. CLI tests and profile hashes do not demonstrate live agent delegation or hook execution.
