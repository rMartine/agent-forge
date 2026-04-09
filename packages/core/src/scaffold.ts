import * as fs from 'node:fs';
import * as path from 'node:path';

const SCAFFOLD_DIRS = [
    'agents',
    'instructions',
    'skills',
    'config',
    'hooks',
    'prompts',
    'scripts',
    'project_docs',
    'project_docs/requirements',
    'project_docs/architecture',
    'project_docs/backlog',
    'project_docs/knowledge',
];

const STARTER_MANIFEST = `{
  // Manifest format version. Only "1.0" is supported.
  "version": "1.0",

  // Target editor.
  "editor": "vscode",

  // Deployment target paths (Windows environment variables expanded at runtime).
  "targets": {
    "prompts": "%APPDATA%/Code/User/prompts",
    "skills": "%USERPROFILE%/.copilot/skills",
    "hooks": "%USERPROFILE%/.copilot/hooks"
  },

  "agents": [],
  "instructions": [],
  "skills": [],
  "toolsets": { "file": "config/common.toolsets.jsonc" },
  "prompts": [],
  "hooks": []
}
`;

export interface ScaffoldResult {
    created: string[];
    skipped: string[];
    manifestCreated: boolean;
}

export async function scaffoldRepo(repoPath: string): Promise<ScaffoldResult> {
    const created: string[] = [];
    const skipped: string[] = [];

    for (const dir of SCAFFOLD_DIRS) {
        const fullPath = path.join(repoPath, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            created.push(dir + '/');
        } else {
            skipped.push(dir + '/');
        }
    }

    const manifestPath = path.join(repoPath, 'agent-forge.manifest.jsonc');
    let manifestCreated = false;
    if (!fs.existsSync(manifestPath)) {
        fs.writeFileSync(manifestPath, STARTER_MANIFEST, 'utf-8');
        manifestCreated = true;
        created.push('agent-forge.manifest.jsonc');
    } else {
        skipped.push('agent-forge.manifest.jsonc');
    }

    return { created, skipped, manifestCreated };
}
