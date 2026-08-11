---
name: query-knowledge-base
description: Search verified repository lessons and an optional PostgreSQL knowledge service for known failures, anti-patterns, and practices. Use when debugging recurring problems, entering an unfamiliar domain, reviewing risky code, or recording a confirmed lesson.
---

# Query Knowledge Base

1. Search `project_docs/knowledge/**/*.md` using distinctive error text, domain terms, and tags.
2. Return only evidence found in the repository; link the source file and distinguish facts from inference.
3. If the optional knowledge service is already running, read [references/postgres.md](references/postgres.md) and query it read-only.
4. Do not start containers solely to answer a query.
5. Report an empty result explicitly. Never invent institutional knowledge.
6. Record a new lesson only after its cause and prevention have been verified.
