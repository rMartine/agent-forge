---
name: engineer-specialized-platforms
description: During an assigned software-product build, route implementation to the relevant platform and installed-version guidance for backend, frontend, database, .NET, desktop, mobile, ML/data, XR, or digital-twin changes.
---

# Engineer Specialized Platforms

1. Detect the actual platform, framework, installed version, lockfile, build system, and repository conventions. A product name or this guide's examples do not override repository evidence. A general technology question does not activate product implementation.
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
3. For a matching stack, read the applicable detailed guide. These are conditional references, not required dependencies or migration targets:
   - [Next.js 15, React 19, Tailwind CSS 4](references/next15-react19-tailwind4.md).
   - [Expo 54 and React Native](references/expo54-react-native.md).
   - [Express 5, GraphQL Yoga 5, and Pothos 4](references/express5-yoga5-pothos4.md).
   - [Drizzle 0.45, PostgreSQL 16, BullMQ 5, and Valkey](references/postgres16-drizzle045-bullmq5.md).
   - [OpenAI Agents for TypeScript](references/openai-agents-typescript.md).
   - [Vitest 4 and Playwright 1.58](references/vitest4-playwright158.md).
   - [Python/FastAPI and Java/Apache Jena](references/conditional-python-java.md), only when the assigned service uses them.
4. Preserve established architecture, product identity, requirements, models, permissions, and deployment boundaries. Do not introduce a new framework, dependency, optimization project, or migration solely because a guide discusses it. .NET and LangChain references apply only when the actual task uses those stacks.
5. Return files changed, applicable commands and results, observed behavior, limitations, and risks. Source inspection and static fixtures do not establish browser, device, data-service, or production behavior.
