# Roster Manifest

## Overview

The roster manifest is the central registry file that describes every managed artifact in the ecosystem. It lives in the repository root and is the single source of truth for what Agent Forge manages. All lifecycle operations read this manifest to determine which files to deploy, restore, wipe, or diff.

## User Stories

### Story 10: Manifest as Source of Truth

**As a** power user
**I want** a single manifest file that lists every agent, instruction, skill, and toolset in my roster
**So that** Agent Forge knows exactly what to manage and I have a single place to see my entire ecosystem

#### Acceptance Criteria

- [ ] Given a valid manifest exists at the repo root, when any operation reads it, then it resolves all file paths relative to the repo root
- [ ] Given the manifest lists an agent, then the agent entry includes: `id` (unique string), `file` (path in repo), `category` (string tag), `toolset` (reference to a toolset name or null)
- [ ] Given the manifest lists an instruction, then the instruction entry includes: `id` (unique string), `file` (path in repo)
- [ ] Given the manifest lists a skill, then the skill entry includes: `id` (unique string), `dir` (directory path in repo)
- [ ] Given the manifest lists a toolsets config, then the toolsets entry includes: `file` (path in repo)
- [ ] Given the manifest lists a prompt, then the prompt entry includes: `id` (unique string), `file` (path in repo)
- [ ] Given the manifest lists a hook, then the hook entry includes: `id` (unique string), `file` (path in repo)
- [ ] Given the manifest defines `targets`, then each target maps a type (prompts, skills, hooks) to an OS-specific absolute path with environment variable support (e.g., `%APPDATA%`)
- [ ] Given the manifest includes a `version` field, then the version follows semver and is used for compatibility checking
- [ ] Given the manifest includes an `editor` field, then it specifies which editor this manifest targets (e.g., `"vscode"`)

#### Manifest Schema

```jsonc
{
  // Manifest format version
  "version": "1.0",

  // Target editor for this manifest
  "editor": "vscode",

  // Deployment target paths (OS-specific, supports env vars)
  "targets": {
    "prompts": "%APPDATA%/Code/User/prompts",
    "skills": "%USERPROFILE%/.copilot/skills",
    "hooks": "%USERPROFILE%/.copilot/hooks"
  },

  // Agent definitions
  "agents": [
    {
      "id": "software-architect",
      "file": "agents/software-architect.agent.md",
      "category": "engineering",
      "model": null,
      "toolset": "design"
    }
  ],

  // Instruction file definitions
  "instructions": [
    {
      "id": "agent-communication",
      "file": "instructions/agent-communication.instructions.md"
    }
  ],

  // Skill definitions (directory-based)
  "skills": [
    {
      "id": "query-knowledge-base",
      "dir": "skills/query-knowledge-base/"
    }
  ],

  // Toolset configuration
  "toolsets": {
    "file": "config/common.toolsets.jsonc"
  },

  // Prompt definitions (reusable slash commands)
  "prompts": [
    {
      "id": "my-slash-command",
      "file": "prompts/my-slash-command.prompt.md"
    }
  ],

  // Hook definitions (lifecycle event configs)
  "hooks": [
    {
      "id": "pre-tool-use",
      "file": "hooks/pre-tool-use.json"
    }
  ]
}
```

#### Edge Cases

- Duplicate `id` values across agents → validation error at manifest load time
- `file` path points to a non-existent file in repo → validation error, listed as warning in status
- Environment variable in `targets` does not resolve → clear error with the unresolved variable name
- Manifest is valid JSON but wrong schema version → error: "Unsupported manifest version X.Y"

---

### Story 11: Manifest Validation

**As a** power user
**I want** the manifest to be validated before any operation executes
**So that** bad configuration is caught early rather than causing partial failures mid-operation

#### Acceptance Criteria

- [ ] Given a manifest with invalid JSON/JSONC syntax, when any command is run, then a parse error is shown with line number
- [ ] Given a manifest missing required fields (`version`, `editor`, `targets`), when validated, then a clear error lists the missing fields
- [ ] Given a manifest with agent entries missing `id` or `file`, when validated, then the invalid entries are listed by index
- [ ] Given a manifest with duplicate IDs, when validated, then the duplicates are listed
- [ ] Given validation passes, then operations proceed; given validation fails, then no file operations are performed

---

### Story 12: Per-Agent Model Override (v1.1)

**As a** power user
**I want** to set the AI model for specific agents in the manifest
**So that** I can use different models for different agent roles without editing agent files directly

#### Acceptance Criteria

- [ ] Given an agent entry has `"model": "claude-sonnet-4"`, when `deploy` runs, then the deployed agent file has its `model` frontmatter field set to `claude-sonnet-4`
- [ ] Given an agent entry has `"model": null`, when `deploy` runs, then the agent file is deployed without modifying its model field (uses whatever the file already has, or editor default)
- [ ] Given the model override is applied, then the original repo file is NOT modified — the override is applied only to the deployed copy
- [ ] Given a CLI command `agent-forge set-model <agent-id> <model>`, then the manifest is updated in place with the new model value

#### Edge Cases

- Agent file has no frontmatter → model override cannot be injected; warn and deploy without it
- Model name is invalid for the editor → deploy anyway (Agent Forge doesn't validate model names, VS Code will handle it)

---

### Story 13: Category Tagging and Selective Remove (v1.1)

**As a** power user
**I want** to tag agents by category and remove entire categories at once
**So that** I can quickly strip down my roster (e.g., remove all ML-related agents)

#### Acceptance Criteria

- [ ] Given agents have `category` values in the manifest, when the user runs `agent-forge remove --category ml`, then all agents tagged `ml` are deleted from target folders
- [ ] Given removal by category, then only agents are affected — instructions, skills, and toolsets shared across categories are NOT removed
- [ ] Given removal completes, then a summary lists which agents were removed and which were retained
- [ ] Given a category that matches no agents, then a warning is shown: "No agents found with category '{name}'"
- [ ] Given removal by category, then a confirmation prompt is shown before deletion

#### Edge Cases

- Agent belongs to multiple categories (future consideration) → for now, agents have a single category string
- Removing a category leaves orphaned skills/toolsets → not handled in v1.1, document for future

## Open Questions

- **OQ-MANIFEST-1**: Should the manifest be JSONC (allowing comments) or strict JSON? JSONC is more user-friendly for a hand-edited file.
- **OQ-MANIFEST-2**: Should the manifest support multiple target path sets per OS (Windows, macOS, Linux) in a single file, or is that handled by editor branches?
- **OQ-MANIFEST-3**: For model override injection, what is the exact frontmatter format? Current agent files use `model: Claude Opus 4.6` in YAML frontmatter — should the manifest use the same string format?
