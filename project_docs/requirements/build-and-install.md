# Build and Install

## Prerequisites

- Node.js 20+ and npm
- VS Code 1.104+
- GitHub Copilot access
- Required provider CLIs/authentication for the chosen full capability profile

## Reproducible build

```powershell
npm ci
npm run build
npm test
npx tsc --noEmit -p packages/extension/tsconfig.json
npm run test:extension-host
```

`npm ci` is authoritative for the committed `package-lock.json`. The build produces core/CLI `dist` and extension `out`; these outputs are ignored and never committed.

The host suite downloads/caches VS Code 1.104 and launches it with isolated user data. It does not deploy to the real Copilot profile.

## Readiness and preview

```powershell
node packages/cli/dist/index.js --repo . validate --strict --target vscode
node packages/cli/dist/index.js --repo . doctor --profile full
node packages/cli/dist/index.js --repo . preview --scope user --profile full
```

The full profile requires exact available tool IDs through the extension or `AGENT_FORGE_AVAILABLE_TOOLS`. Models may be listed through `AGENT_FORGE_AVAILABLE_MODELS`; absent valid mappings inherit.

## Install

`scripts/install.ps1` runs `npm ci`, build, validate, doctor, and preview. It changes the VS Code user profile only with `-Deploy` and a second typed `DEPLOY` confirmation. `-UsePrebuilt` is accepted only when the CLI artifact already exists.

No command in verification or tests touches the real `~/.copilot` profile. Repository implementation does not authorize publishing the extension, pushing, provider installation, or a live roster deployment.
