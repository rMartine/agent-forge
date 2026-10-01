# MCP and Capability Management

This policy applies to the VS Code Copilot target. Codex custom agents inherit the user's existing MCP configuration; Agent Forge Doctor reports missing families but never edits `~/.codex/config.toml` or secrets.

## Providers

Logical provider names remain stable: `canva`, `gitkraken`, `docker`, `github`, and `digitalocean`. Direct provider definitions use current VS Code `servers` entries. GitHub and DigitalOcean may be supplied through Docker MCP Toolkit and are therefore diagnosed as manual provider enablement rather than emitted as invalid standalone servers.

## Setup workflow

1. Load `config/mcp-providers.jsonc`.
2. Detect command readiness and manual/OAuth requirements.
3. Produce a provider-by-provider preview.
4. Para cada proveedor que pueda añadirse, el asistente debe comprobar que la autorización vigente de Roberto cubre añadir ese proveedor y su destino. Si ya lo cubre, continúa conforme al protocolo de la herramienta; si no, solicita aprobación explícita para ese proveedor antes de añadirlo. Las interacciones de confianza o autenticación que la interfaz exija deben respetarse y no equivalen por sí solas a una nueva autorización del encargo.
5. Merge via the official `code --add-mcp` interface.
6. Leave trust and OAuth prompts to VS Code.
7. Refresh the tool inventory through VS Code or configured exact IDs.
8. Block full deployment until each required capability maps to at least one installed exact tool ID.

No secret value is written. Configuration uses URLs, commands, arguments, inputs, or environment-variable names. Existing MCP configuration is merged, never replaced wholesale.

## Access policy

`config/capability-catalog.jsonc` separates logical read, write, and admin capabilities. Rendered tools include only matched IDs. A wildcard is accepted only where the full server is intentional, currently Canva design production. Prompt restrictions supplement but do not enforce external authorization.

VS Code MCP sandboxing is not represented as a Windows security control; current VS Code documentation states that MCP sandboxing is unavailable on Windows.
