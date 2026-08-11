# Prompts and Hooks

## Prompts

Agent Forge v2 does not manage prompt files. `prompts/.gitkeep` and the obsolete shared prompts target were removed. Agents, instructions, and skills have distinct current VS Code user locations.

Adding prompts later requires a manifest schema revision, a dedicated current VS Code prompt target, ownership coverage, collision tests, and diagnostics. It must not reuse a legacy `%APPDATA%/Code/User/prompts` abstraction.

## Hooks

Hooks are optional managed artifacts targeting `~/.copilot/hooks`. `hooks/.gitkeep` remains until a documented hook is introduced.

Custom hooks are preview functionality. No P0 safety guarantee depends on `PreToolUse` or any hook. Hook configuration must never claim to be a Windows security sandbox, and any sensitive-operation policy must also exist in stable approval/ownership controls.
