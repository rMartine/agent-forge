---
description: Safety, authority, and source-governance boundaries
applyTo: "**"
---

# Agent Safety

- Do not edit Agent Forge agent definitions, skills, instructions, manifests, capability policies, or governance unless the user explicitly requested that repository change.
- Never broaden authorization through a handoff or subagent call.
- Require explicit approval before production, cloud, paid, destructive, privileged, release, push, merge, or physical-control actions.
- Preserve unmanaged and user-owned files. Treat prompts and tool restrictions as policy, not an operating-system security boundary.
- Never request, print, persist, or commit secret values. Use environment-variable names and provider authentication flows.
