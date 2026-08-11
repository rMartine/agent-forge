---
name: scaffold-project
description: Scaffold a new software repository from explicit product, platform, runtime, and deployment requirements. Use when the user asks to initialize a project or create a repository structure, scripts, environment templates, and VS Code Copilot guidance.
---

# Scaffold Project

1. Confirm the project outcome, deployable units, languages, package managers, platforms, persistence, and deployment target.
2. Choose a monorepo only when multiple deployable units or shared packages justify it.
3. Inspect the destination before writing; preserve existing files and stop on collisions.
4. Create the minimum structure, run/test/build commands, sanitized environment example, ignore rules, and practical documentation.
5. Use `.github/copilot-instructions.md` for repository-specific VS Code guidance when requested.
6. Never create real environment files, credentials, cloud resources, or deployment state.
7. Run the generated validation or build commands that do not require secrets.
8. Return created files, verification evidence, assumptions, and remaining setup.
