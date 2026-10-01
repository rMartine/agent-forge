# Build and Install

## Prerequisites

- Node.js 20+ and npm
- VS Code 1.104+ with GitHub Copilot for the Copilot target
- OpenAI Codex IDE extension (`openai.chatgpt`) for the Codex target
- provider authentication only for capability families required by the selected VS Code profile

Codex agents inherit the user's model, MCP, permissions, sandbox, and approval policy. Agent Forge does not provision Codex MCP servers.

## Reproducible verification

Los siguientes comandos son la secuencia documentada para preparar y realizar la verificación completa del proyecto desde su raíz. El asistente debe usar las actividades que correspondan al cambio autorizado y a las condiciones vigentes de integración o lanzamiento. La existencia de esta secuencia no exige instalar dependencias ni ejecutar todos sus comandos para cada edición o commit.

```powershell
npm ci
npm run build
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
```

`npm ci` is authoritative for `package-lock.json`. Core and CLI `dist`, extension `out`, isolated profiles, and deployment fixtures are ignored. Tests inject temporary `USERPROFILE` and never write real `.copilot`, `.codex`, or `.agents` directories.

## Doctor and immutable preview

```powershell
node packages/cli/dist/index.js --repo . doctor --target codex
node packages/cli/dist/index.js --repo . doctor --target all --profile full
node packages/cli/dist/index.js --repo . preview --target all --scope user --profile full
```

Preview persists `~/.agent-forge/plans/<id>.json` with exact rendered bytes and hashes. It may contain no secrets. A plan with error diagnostics remains non-deployable.

VS Code full readiness requires exact installed tool IDs via the extension or `AGENT_FORGE_AVAILABLE_TOOLS`. Optional model mappings use `AGENT_FORGE_AVAILABLE_MODELS`; an unavailable mapping falls back to inheritance.

## Install

```powershell
node packages/cli/dist/index.js --repo . deploy --target all --plan <id> --confirm <id>
node packages/cli/dist/index.js --repo . status --target all
```

The plan and confirmation IDs must match. Apply loads the persisted plan and never renders again. A grouped failure restores both runtimes and leaves the previous ledger active.

`scripts/install.ps1 -Target all` performs dependency install, build, validate, doctor, and preview. `-Deploy` prompts for the exact generated plan ID. `-UsePrebuilt` is accepted only when the compiled CLI exists.

## Cleanup, rollback, and wipe

```powershell
agent-forge cleanup --target all --managed-only
agent-forge cleanup --target all --managed-only --plan <cleanup-id> --confirm <cleanup-id>
agent-forge rollback --target codex --deployment <id>
agent-forge wipe --target vscode --managed-only --confirm <active-id>
```

Cleanup considers stale ledger-owned files only. Rollback and wipe compare current content hashes and preserve modified or unmanaged customizations.

## Live profile verification

Este procedimiento documenta una instalación sobre un perfil real; no es una preparación obligatoria para mantener el repositorio. El asistente debe contar con autorización vigente para aplicar el plan concreto y respetar la interacción que exija la herramienta. Los pasos 1 a 3 se realizan antes de aplicar; el paso 4 sólo se realiza cuando la operación está autorizada; los pasos 5 a 7 son observaciones posteriores.

1. Antes de aplicar, el asistente calcula los hashes de ~/.codex/AGENTS.md y ~/.codex/config.toml.
2. Antes de aplicar, el asistente obtiene el inventario existente de ~/.codex/skills, ~/.codex/agents y ~/.agents/skills.
3. Antes de aplicar, el asistente inspecciona todas las acciones de limpieza del plan.
4. Cuando la autorización vigente cubra la aplicación del plan concreto y se haya cumplido el protocolo de la herramienta, el asistente aplica exactamente ese plan confirmado.
5. Después de aplicar, el asistente verifica 24 agentes Copilot, 16 agentes Codex y cinco paquetes Codex con prefijo.
6. Después de aplicar, el asistente observa si el estado informa que ambos entornos están sincronizados, conforme al plan aplicado y la operación autorizada.
7. Después de aplicar, el asistente confirma que los hashes protegidos y el inventario de procedimientos personales no cambiaron.

Si la autorización no cubre aplicar el plan, la preparación no debe incluir esa aplicación. Autorizar una instalación no autoriza por sí mismo otras operaciones externas ni la eliminación de archivos no administrados; el asistente debe comprobar si el encargo incluye expresamente esas otras acciones.

Antes de publicar la extensión, publicar ramas de Git, instalar proveedores, modificar recursos de nube o eliminar archivos no administrados, el asistente debe comprobar que Roberto autorizó expresamente esa acción, sus efectos y su destino. Si la autorización vigente ya los cubre, no debe pedirla de nuevo. Si no los cubre, debe solicitar únicamente la autorización pendiente antes de realizar esa acción. La autorización de una instalación de Agent Forge no autoriza por sí misma las otras acciones de esta enumeración.
