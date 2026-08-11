---
name: engineer-specialized-platforms
description: Route implementation to concise platform-specific engineering guidance after detecting the repository stack. Use for backend, frontend, database, .NET, desktop, mobile, ML/data, XR, or digital-twin changes that require specialized quality and verification concerns.
---

# Engineer Specialized Platforms

1. Detect the actual platform, framework, version, build system, and repository conventions.
2. Read only the matching reference:
   - [backend.md](references/backend.md)
   - [frontend.md](references/frontend.md)
   - [database.md](references/database.md)
   - [dotnet.md](references/dotnet.md)
   - [desktop.md](references/desktop.md)
   - [mobile.md](references/mobile.md)
   - [ml-data.md](references/ml-data.md)
   - [xr.md](references/xr.md)
   - [digital-twin.md](references/digital-twin.md)
3. Preserve established architecture unless the requested outcome requires a recorded change.
4. Implement the smallest cohesive change and verify it through the repository's intended toolchain.
5. Return files changed, behavioral evidence, limitations, and risks.
