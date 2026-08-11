# Repository Conventions

- `agents/*.agent.md` is the sole canonical roster.
- Stable IDs are lowercase kebab-case and match manifest keys and evaluation fixture names.
- Skills use lowercase matching directories and frontmatter names; detailed material stays one level under `references/`.
- Automatically deployed instructions declare intentional `applyTo`.
- The core package is authoritative; CLI, extension, and scripts are adapters.
- Source agents are never rewritten during model/capability selection.
- Generated `dist/`, `out/`, coverage, extension test profiles, and deployment fixtures are ignored.
- Tests use temporary user profiles and never the real `~/.copilot` directory.
- Production/cloud/push/release/destructive actions require explicit authority.
- Work occurs on dedicated `codex/*` branches with atomic Conventional Commits.
- Build with the committed npm lockfile: `npm ci`, `npm run build`, `npm test`.
