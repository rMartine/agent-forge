import * as fs from 'node:fs';
import * as path from 'node:path';

const SCAFFOLD_DIRS = ['agents', 'instructions', 'skills', 'config', 'hooks', 'schemas', 'docs'];
const STARTER_MANIFEST = `{
  "schemaVersion": 3,
  "platforms": ["vscode", "codex"],
  "scope": "user",
  "targets": {
    "vscode": {
      "agents": "%USERPROFILE%/.copilot/agents",
      "instructions": "%USERPROFILE%/.copilot/instructions",
      "skills": "%USERPROFILE%/.copilot/skills",
      "hooks": "%USERPROFILE%/.copilot/hooks"
    },
    "codex": {
      "agents": "%USERPROFILE%/.codex/agents",
      "skills": "%USERPROFILE%/.agents/skills"
    },
    "state": "%USERPROFILE%/.agent-forge/state.json"
  },
  "capabilityCatalog": "config/capability-catalog.jsonc",
  "modelProfiles": "config/model-profiles.jsonc",
  "mcpProviders": "config/mcp-providers.jsonc",
  "agents": {},
  "instructions": [],
  "skills": [],
  "hooks": [],
  "codex": { "agents": {}, "skillBundles": {} }
}
`;

export interface ScaffoldResult { created: string[]; skipped: string[]; manifestCreated: boolean; }
export async function scaffoldRepo(repoPath: string): Promise<ScaffoldResult> {
  const created: string[] = [];
  const skipped: string[] = [];
  for (const dir of SCAFFOLD_DIRS) {
    const fullPath = path.join(repoPath, dir);
    if (!fs.existsSync(fullPath)) { fs.mkdirSync(fullPath, { recursive: true }); created.push(`${dir}/`); }
    else skipped.push(`${dir}/`);
  }
  const manifestPath = path.join(repoPath, 'agent-forge.manifest.jsonc');
  const manifestCreated = !fs.existsSync(manifestPath);
  if (manifestCreated) { fs.writeFileSync(manifestPath, STARTER_MANIFEST, 'utf8'); created.push('agent-forge.manifest.jsonc'); }
  else skipped.push('agent-forge.manifest.jsonc');
  return { created, skipped, manifestCreated };
}
