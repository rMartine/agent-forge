import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { DeploymentManifestV3 } from './types.js';
import type { ExternalSkillCatalog } from './externalSkills.js';
import type { RenderedCodexSkillFile } from './skillBundles.js';
import type { SharedHooksGroups } from './sharedHooks.js';
import { resolveRepoFilePath } from './paths.js';

export async function renderProductDevelopmentSkill(repoPath: string, manifest: DeploymentManifestV3, catalog: ExternalSkillCatalog): Promise<RenderedCodexSkillFile[]> {
  const product = manifest.codex.productDevelopment;
  if (!product) return [];
  const deploymentName = product.deploymentName;
  const files: RenderedCodexSkillFile[] = [];
  const sourceRoot = resolveRepoFilePath(repoPath, product.source);
  async function visit(directory: string): Promise<void> {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const sourcePath = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error(`Product skill resources must not be symbolic links: ${sourcePath}`);
      if (item.isDirectory()) await visit(sourcePath);
      else if (item.isFile()) {
        const relativePath = path.relative(sourceRoot, sourcePath);
        let content = await readFile(sourcePath);
        if (relativePath === 'SKILL.md') content = Buffer.from(content.toString('utf8').replace(/^name:.*$/m, `name: ${deploymentName}`));
        files.push({ relativePath, sourcePath, content });
      }
    }
  }
  await visit(sourceRoot);
  for (const script of ['product-session.mjs', 'product-hooks.mjs']) {
    const sourcePath = resolveRepoFilePath(repoPath, `${product.hooksSource}/${script}`);
    files.push({ relativePath: `scripts/${script}`, sourcePath, content: await readFile(sourcePath) });
  }
  const agents = Object.fromEntries(Object.values(manifest.codex.agents).map(agent => [agent.id, {
    evidenceWriter: agent.sandboxMode === 'read-only' ? 'principal' : 'agent',
    skillNames: [...agent.requiredSkillBundles.map(id => manifest.codex.skillBundles[id].deploymentName), ...catalog.skills.filter(skill => skill.agentIds.includes(agent.id)).map(skill => skill.deploymentName)],
    instructions: agent.instructionOverlay,
    evidence: agent.completionEvidence ?? ['Return the assigned result, observed checks and remaining limitations.'],
  }]));
  files.push({ relativePath: 'scripts/product-roles.json', sourcePath: path.join(repoPath, 'agent-forge.manifest.jsonc'), content: Buffer.from(JSON.stringify({ agents }, null, 2) + '\n') });
  const matrix = ['# Specialists available for the assigned product', '',
    'Select by the responsibility required by the product. The primary agent retains coordination and final integration. Read each selected agent and only its relevant skills.', '',
    ...Object.entries(agents).flatMap(([id, role]) => [`## ${id}`, '', role.instructions, '', `Available skills: ${role.skillNames.map(name => `$${name}`).join(', ')}.`, '', ...role.evidence.map(item => `- ${item}`), '']),
  ].join('\n');
  files.push({ relativePath: 'references/agent-responsibilities.md', sourcePath: path.join(repoPath, 'agent-forge.manifest.jsonc'), content: Buffer.from(matrix) });
  return files;
}

export function productDevelopmentHookGroups(manifest: DeploymentManifestV3, skillTarget: string): SharedHooksGroups {
  const product = manifest.codex.productDevelopment;
  if (!product) return {};
  const script = path.join(skillTarget, product.deploymentName, 'scripts', 'product-hooks.mjs').replaceAll('\\', '/');
  if (/["\r\n]/.test(script)) throw new Error('Unsupported quote or newline in product hook path');
  const command = `node "${script}"`;
  const handler = { type: 'command', command, timeout: 10 };
  const matchers = Object.keys(manifest.codex.agents).map(id => {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Unsafe agent matcher: ${id}`);
    return { matcher: `^${id}$`, hooks: [{ ...handler }] };
  });
  return {
    SubagentStart: matchers,
    SubagentStop: matchers,
    Stop: [{ hooks: [{ ...handler }] }],
    Interrupt: [{ hooks: [{ ...handler, timeout: 3 }] }],
    SessionEnd: [{ hooks: [{ ...handler, timeout: 3 }] }],
  };
}
