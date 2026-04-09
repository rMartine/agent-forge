# Agent Forge

A VS Code extension + CLI that manages the lifecycle of a GitHub Copilot custom agent ecosystem. Agents, instructions, skills, toolset configs, prompts, and hooks are stored in a Git repo and deployed to their OS-specific target folders with a single command.

## Prerequisites

- **Node.js** 18+
- **VS Code** 1.85+
- **Git** (recommended; versioning features are skipped if unavailable)
- **Python 3.11+** with PyTorch + CUDA (recommended; required for image generation via `diffusers`)
- **Docker Desktop** (recommended; required for the knowledge base repository)

> **Note:** Ollama image generation is macOS-only as of Jan 2026. On Windows/Linux the extension uses Python `diffusers` as the primary image generation runtime.

## Install

```powershell
git clone <your-repo-url> agent-forge
cd agent-forge
.\scripts\install.ps1
```

The install script builds all packages, packages the extension as a VSIX, installs it into VS Code, and links the CLI globally.

## CLI Usage

All commands accept `--repo <path>` (defaults to cwd) and `-y` to skip confirmation prompts.

```
agent-forge deploy      # Deploy roster files to target OS folders
agent-forge restore     # Overwrite local files with repo state
agent-forge wipe        # Delete all managed files from target folders
agent-forge status      # Show sync status (repo vs. local)
```

## VS Code Extension

Open the Command Palette and search for **Agent Forge**:

| Command | Description |
|---------|-------------|
| Agent Forge: Deploy | Deploy roster to target folders |
| Agent Forge: Restore | Restore local files from repo |
| Agent Forge: Wipe | Remove all managed files |
| Agent Forge: Status | Show sync status |
| Agent Forge: Set Repository Path | Configure the roster repo location |
| Agent Forge: Enable Sub-Agent Nesting | Allow agents to invoke other agents |
| Agent Forge: Select Image Model | Auto-detect GPU and configure the image generation model |

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agentForge.repoPath` | string | `""` | Absolute path to the roster Git repository |
| `agentForge.autoConfirm` | boolean | `false` | Skip confirmation for destructive operations |
| `agentForge.imageModelStoragePath` | string | `""` | Where image models are stored (default: `~/.agent-forge/models`) |
| `agentForge.generatedAssetsPath` | string | `""` | Where the graphic-designer saves generated/downloaded assets (default: project `generated/` folder) |

## Agent Roster

Agent Forge ships with **21 agents** organized into divisions:

### Leadership
| Agent | Model | Role |
|-------|-------|------|
| CTO | Claude Opus 4.6 | Strategic orchestrator, single entry point for all work |
| Principal Engineer | Claude Opus 4.6 | Implementation lead, delegates to domain engineers |
| Project Manager | — | Delivery planning, sprints, backlog tracking |

### Engineering
| Agent | Specialization |
|-------|---------------|
| Backend Developer | Node.js, TypeScript APIs, databases |
| Frontend Developer | React, Next.js, Tailwind, web UIs |
| Database Engineer | PostgreSQL, schema design, migrations |
| DevOps Engineer | Docker, CI/CD, infrastructure |
| .NET Engineer | WPF, Avalonia, C#, .NET desktop apps |
| Desktop App Engineer | C++/Qt, Rust/Tauri, Python/PySide6 native apps |
| Mobile Engineer | React Native, Flutter, mobile platforms |
| ML Engineer | Machine learning pipelines, model training |
| Data Scientist | Data analysis, statistical modeling |
| Cybersecurity Engineer | Security audits, vulnerability scanning |
| QA Engineer | Testing strategy, test coverage |

### Design
| Agent | Specialization |
|-------|---------------|
| Creative Director | Product vision, branding, naming |
| Graphic Designer | Image generation (SDXL Lightning), stock image search, branding assets |
| UX Engineer | User experience, design systems, accessibility |

### Documentation
| Agent | Specialization |
|-------|---------------|
| Technical Writer | API docs, README, changelog, runbooks |
| Knowledge Engineer | Institutional memory, error pattern catalog |
| Requirements Engineer | User stories, acceptance criteria |
| Software Architect | System design, ADRs, API contracts |

## Skills

| Skill | Description |
|-------|-------------|
| `scaffold-project` | Scaffold a mono-repo with Docker Compose, scripts, and project docs |
| `query-knowledge-base` | Search the team's error patterns, anti-patterns, and lessons learned |
| `generate-logo` | Generate logo concepts using SDXL Lightning (4-step) |
| `search-stock-images` | Search Unsplash, Pexels, Pixabay for royalty-free images |

## Image Generation

The graphic-designer agent uses **SDXL Lightning** (ByteDance) for fast, high-quality image generation:

- **Runtime**: Python `diffusers` (Windows/Linux), Ollama (macOS only)
- **Model**: Auto-selected by GPU VRAM — SDXL Lightning (6GB+), SD 1.5 (4GB+), CPU fallback
- **Storage**: Models stored at `agentForge.imageModelStoragePath` (default: `~/.agent-forge/models`)
- **Assets**: Generated images saved to `agentForge.generatedAssetsPath` (default: project `generated/` folder)

Run `Agent Forge: Select Image Model` from the command palette to detect your GPU and download the appropriate model.

## Documentation

See [`project_docs/`](project_docs/) for detailed requirements, architecture, and knowledge base.
