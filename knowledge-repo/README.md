# Knowledge Repository

PostgreSQL-backed knowledge base for the Agent Forge ecosystem.

## Quick Start

```bash
# Start the stack
docker compose up -d

# Verify health
docker compose ps

# Stop
docker compose down

# Stop and destroy data
docker compose down -v
```

## Connection Details

| Property | Value |
|----------|-------|
| Host     | `localhost` |
| Port     | `5433` |
| Database | `knowledge` |
| User     | `knowledge_admin` |
| Password | Value of `KB_POSTGRES_PASSWORD` (default: `agent-forge-kb-dev`) |

### psql

```bash
psql -h localhost -p 5433 -U knowledge_admin -d knowledge
```

### Connection string

```
postgresql://knowledge_admin:agent-forge-kb-dev@localhost:5433/knowledge
```

## Example Queries

```sql
-- All critical error patterns
SELECT title, description FROM entries
WHERE type = 'error-pattern' AND severity = 'critical';

-- Full-text search
SELECT title, description FROM entries
WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', 'docker compose');

-- Entries by domain
SELECT title, type, severity FROM entries
WHERE 'backend' = ANY(affected_domains);

-- Entries by tag
SELECT title, type FROM entries
WHERE tags @> ARRAY['typescript'];
```

## Configuration

Copy `.env.example` to `.env` and set `KB_POSTGRES_PASSWORD` to override the default password.
