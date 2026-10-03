import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

const json = value => JSON.stringify(value, null, 2) + '\n';
const textPath = value => value.replaceAll('\\', '/');

function absoluteLinks(text, directory) {
  return text.replace(/\]\(([^)]+)\)/g, (whole, target) => {
    if (/^(?:[a-z]+:|#|\/)/i.test(target)) return whole;
    return `](${textPath(path.resolve(directory, target))})`;
  });
}

// A generated definition has no permission overrides. The role's read-only
// requirement is preserved in its instructions and in session hook checks.
export async function generateResearchDefinitions(sourceRoot, installedRoot, codexHome) {
  const roster = JSON.parse(await readFile(path.join(sourceRoot, 'research-roster.json'), 'utf8'));
  const commonFile = path.join(sourceRoot, 'roles', 'research-specialist-common.md');
  const common = absoluteLinks(await readFile(commonFile, 'utf8'), path.join(installedRoot, 'roles'));
  const result = [];
  for (const role of roster.specialists) {
    if (!/^research-[a-z0-9-]+$/.test(role.id)) throw new Error('Invalid global research agent name');
    const instructions = [
      common,
      absoluteLinks(await readFile(path.join(sourceRoot, role.roleFile), 'utf8'), path.dirname(path.join(installedRoot, role.roleFile))),
      `The module root is ${textPath(installedRoot)}. Catalog references are relative to this root.`,
      `Common conditions: ${textPath(path.join(installedRoot, 'roles', 'research-specialist-common.md'))}. Role procedure: ${textPath(path.join(installedRoot, role.roleFile))}.`,
      `Assigned skills, to read only when applicable: ${json(role.skills.map(file => textPath(path.join(installedRoot, file))))}`,
      `Additional installed skills, when relevant: ${json(role.externalSkills)}`,
      `Required completion evidence: ${json(role.completionEvidence)}`,
      role.readOnly ? 'This role is read-only. Return proposed changes to the principal; do not execute shell or writing tools.' : 'Use only the authorized assignment and current platform permissions.',
      'Do not delegate or spawn subagents. Return unresolved scientific choices and deliverables to the principal.',
      'The model and reasoning effort are configured by this global agent definition. Inherit MCP configuration, permissions and approval policy; never weaken approvals.',
    ].join('\n\n');
    // TOML basic strings share these JSON escapes; prohibit controls JSON does
    // not encode with TOML-compatible escapes rather than emitting invalid TOML.
    if (/[\u007f]/.test(instructions)) throw new Error('Unsupported instruction control character');
    const content = [`name = ${JSON.stringify(role.id)}`, `description = ${JSON.stringify(role.name)}`, `model = ${JSON.stringify(role.model)}`, `model_reasoning_effort = ${JSON.stringify(role.reasoning)}`, `developer_instructions = ${JSON.stringify(instructions)}`, ''].join('\n');
    result.push({ kind: 'agent', name: role.id, path: path.join(codexHome, 'agents', `${role.id}.toml`), bytes: Buffer.from(content) });
  }
  for (const entry of (await readdir(path.join(sourceRoot, 'skills'), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || !/^[a-z][a-z0-9-]+$/.test(entry.name)) throw new Error('Invalid research skill directory');
    const original = await readFile(path.join(sourceRoot, 'skills', entry.name, 'SKILL.md'), 'utf8');
    const description = original.match(/^description:\s*(.*(?:\n[ \t]+[^\n]+)*)/m)?.[1]?.replace(/\s+/g, ' ').trim() || `Research procedure: ${entry.name}`;
    const name = `agent-forge-research-${entry.name}`;
    const procedure = textPath(path.join(installedRoot, 'skills', entry.name, 'SKILL.md'));
    const content = `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\nRead and apply [the complete ${entry.name} procedure](<${procedure}>) when it matches the authorized assignment. Its references, scripts and other resources remain under ${textPath(path.join(installedRoot, 'skills', entry.name))}; resolve relative references against the original procedure's directory.\n`;
    result.push({ kind: 'skill', name, path: path.join(codexHome, 'skills', name, 'SKILL.md'), bytes: Buffer.from(content) });
    const metadataPath = path.join(sourceRoot, 'skills', entry.name, 'agents', 'openai.yaml');
    let metadata;
    try { metadata = await readFile(metadataPath, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (metadata !== undefined) {
      const adapted = metadata.replace(/\$(nature-(?:shared|writing|response))\b/g, '$agent-forge-research-$1');
      result.push({ kind: 'skill-metadata', name, path: path.join(codexHome, 'skills', name, 'agents', 'openai.yaml'), bytes: Buffer.from(adapted) });
    }
  }
  return result;
}
