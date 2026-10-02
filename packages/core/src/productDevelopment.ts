import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { DeploymentManifestV3 } from './types.js';
import type { ExternalSkillCatalog } from './externalSkills.js';
import type { RenderedCodexSkillFile } from './skillBundles.js';
import type { SharedHooksGroups } from './sharedHooks.js';
import { resolveRepoFilePath } from './paths.js';

interface ProductHookDescription {
  event: string;
  agentType?: string;
  statusMessage: string;
  explanation: string;
  timeout: number;
}

function describeProductHooks(manifest: DeploymentManifestV3): ProductHookDescription[] {
  if (!manifest.codex.productDevelopment) return [];
  const specialists = Object.values(manifest.codex.agents).flatMap(agent => {
    const name = agent.displayName ?? agent.id;
    const principalRecordsEvidence = agent.sandboxMode === 'read-only';
    return [
      {
        event: 'SubagentStart', agentType: agent.id, timeout: 10,
        statusMessage: `${name}: preparar contexto y requisitos`,
        explanation: 'Registra la participación del especialista y le entrega sus instrucciones, skills asignadas, evidencias requeridas e identificadores para informar resultados. El agente principal conserva la coordinación.',
      },
      {
        event: 'SubagentStop', agentType: agent.id, timeout: 10,
        statusMessage: principalRecordsEvidence
          ? `${name}: dejar el registro de resultados al agente principal`
          : `${name}: comprobar resultados registrados`,
        explanation: principalRecordsEvidence
          ? 'Permite terminar al especialista de solo lectura. El agente principal debe registrar la evidencia que recibió de él antes de cerrar el trabajo del producto; este hook no exige escritura ni comprueba el contenido de su respuesta.'
          : 'Comprueba que exista el registro de resultados y comprobaciones del especialista. Si falta, puede pedir una sola continuación para registrar el resultado real o el impedimento. Señala comprobaciones fallidas u omitidas; el agente principal evalúa su importancia.',
      },
    ];
  });
  return [...specialists,
    {
      event: 'Stop', timeout: 10,
      statusMessage: 'Producto: comprobar evidencias y cerrar el trabajo',
      explanation: 'Comprueba los registros del agente principal y de los especialistas participantes. Puede pedir una sola continuación por evidencias ausentes. Después desactiva el registro e informa sus limitaciones; no certifica la calidad del producto.',
    },
    {
      event: 'Interrupt', timeout: 3,
      statusMessage: 'Producto: registrar la interrupción del trabajo',
      explanation: 'Marca como interrumpido el registro activo para respetar la interrupción del usuario. No reanuda trabajo ni solicita continuaciones.',
    },
    {
      event: 'SessionEnd', timeout: 3,
      statusMessage: 'Producto: cerrar el registro al terminar la sesión',
      explanation: 'Marca el registro existente como terminado cuando finaliza la sesión. No inicia otra sesión ni realiza un despliegue.',
    },
  ];
}

function renderProductHookReference(manifest: DeploymentManifestV3): string {
  const hooks = describeProductHooks(manifest);
  return [
    '# Qué hace cada hook de Agent Forge', '',
    `Inventario completo de los ${hooks.length} hooks generados para este conjunto de agentes. Cada título es el texto de statusMessage instalado en Codex.`, '',
    'Solo actúan sobre una sesión y un proyecto registrados como trabajo de construcción de un producto. Fuera de ese contexto no añaden instrucciones ni piden continuaciones. Comparten un programa y cada entrada selecciona el evento y, cuando corresponde, el tipo de especialista.', '',
    'El agente principal decide qué especialistas necesita el producto. Los hooks comprueban registros, no la corrección del software. No conceden permisos, cambian modelos, publican ramas ni despliegan servicios. Ante errores informan la limitación sin impedir indefinidamente el cierre. Los límites de tiempo y la única continuación permitida evitan ciclos.', '',
    ...hooks.flatMap(hook => [
      `## ${hook.statusMessage}`, '',
      `Evento: ${hook.event}.${hook.agentType ? ` Agente: ${hook.agentType}.` : ' Corresponde a la sesión principal.'} Tiempo máximo configurado: ${hook.timeout} segundos.`, '',
      hook.explanation, '',
    ]),
    '## Cómo aparecen en Codex', '',
    'La extensión inspeccionada muestra statusMessage como nombre de cada entrada en la lista y en la revisión de hooks. La documentación oficial también lo define como mensaje durante la ejecución. La presentación concreta depende de la versión del cliente; no se añaden campos name o displayName que Codex no documenta para los handlers.', '',
    'Cambiar estos textos modifica la definición y puede requerir que Codex renueve su revisión de confianza. Referencia oficial: https://learn.chatgpt.com/docs/hooks.', '',
  ].join('\n');
}

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
  files.push({ relativePath: 'references/hooks.md', sourcePath: path.join(repoPath, 'agent-forge.manifest.jsonc'), content: Buffer.from(renderProductHookReference(manifest)) });
  return files;
}

export function productDevelopmentHookGroups(manifest: DeploymentManifestV3, skillTarget: string): SharedHooksGroups {
  const product = manifest.codex.productDevelopment;
  if (!product) return {};
  const script = path.join(skillTarget, product.deploymentName, 'scripts', 'product-hooks.mjs').replaceAll('\\', '/');
  if (/["\r\n]/.test(script)) throw new Error('Unsupported quote or newline in product hook path');
  const command = `node "${script}"`;
  const groups: SharedHooksGroups = {};
  for (const hook of describeProductHooks(manifest)) {
    if (hook.agentType && !/^[a-z0-9-]+$/.test(hook.agentType)) throw new Error(`Unsafe agent matcher: ${hook.agentType}`);
    const handler = { type: 'command', command, timeout: hook.timeout, statusMessage: hook.statusMessage };
    (groups[hook.event] ??= []).push({
      ...(hook.agentType ? { matcher: `^${hook.agentType}$` } : {}),
      hooks: [handler],
    });
  }
  return groups;
}
