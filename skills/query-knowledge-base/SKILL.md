---
name: query-knowledge-base
description: "Query the knowledge base for error patterns, anti-patterns, lessons learned, and best practices. Use when encountering errors, starting work in a new domain, debugging recurring issues, or checking for known pitfalls before implementation."
argument-hint: "Describe what you're looking for (e.g., 'PostgreSQL connection pool exhaustion patterns')"
---

# Query Knowledge Base

Search the team's institutional knowledge for relevant error patterns, anti-patterns, lessons learned, and best practices.

## When to Use

- Before starting implementation in a domain with known pitfalls
- When encountering an error or unexpected behavior
- During code review to check for known anti-patterns
- After a bug fix to see if the pattern is already cataloged

> **Infrastructure note:** Steps 1 (local cache) and 2 (Postgres KB container) are independent. The local cache in `project_docs/knowledge/` is ALWAYS available — just markdown files in the repo. The Postgres KB stack is OPTIONAL: it ships in `knowledge-repo/docker-compose.yml` and only matters if `@knowledge-engineer` has it deployed in the current workspace. If only the local cache exists, do step 1 and skip step 2.

## Procedure

### 1. Check Local Cache First (always available)

Look in `project_docs/knowledge/` for locally cached entries relevant to the query. These are curated markdown entries specific to the current project. Use `Grep` over `project_docs/knowledge/**/*.md` for keyword search.

```
project_docs/knowledge/
  *.md                    # Knowledge entries in markdown format
```

Search by keywords, domain tags, and error messages.

### 2. Query the Knowledge Repository (OPTIONAL — only if Docker stack is up)

First confirm the container is running: `docker ps --filter "name=knowledge-repo"`. If absent, skip this step entirely — do not try to spin it up just for a query.

If the Docker-based PostgreSQL knowledge repository is running, query it for broader cross-project patterns.

Connect to the knowledge database:
- Host: `localhost`
- Port: `5433` (default for knowledge repo, avoids conflict with project DB)
- Database: `knowledge`
- Table: `entries`

Example queries:
```sql
-- Search by domain
SELECT * FROM entries WHERE 'backend' = ANY(affected_domains) ORDER BY severity, updated DESC;

-- Search by keywords (full-text)
SELECT * FROM entries WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', 'your search terms');

-- Search by error type
SELECT * FROM entries WHERE type = 'error-pattern' AND tags @> ARRAY['connection-pool'];
```

### 3. Return Results

For each matching entry, return:
- **Title** and **severity**
- **Description** of the issue
- **Prevention** steps
- **Examples** with code snippets if available

If no matches found, state that clearly — do not fabricate entries.

## Entry Format Reference

Knowledge entries follow this structure:
- `type`: error-pattern | anti-pattern | lesson-learned | best-practice
- `severity`: critical | high | medium | low
- `affected_domains`: backend, frontend, infrastructure, database, security, ml
- `tags`: searchable keywords
- `prevention`: how to avoid the issue
- `detection`: how to spot it early
