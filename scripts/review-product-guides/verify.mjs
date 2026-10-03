import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const designIds = new Set(['impeccable', 'emil-design-eng', 'animate-expo', 'review-animations', 'break-ui', 'taste-frontend']);

export function applyExactAdaptations(text, changes, label) {
  for (const change of changes) {
    assert.equal(text.split(change.find).length, 2, `${label}: adaptation must match once`);
    text = text.replace(change.find, change.replace);
  }
  return text;
}

export function missingLocalLinks(files) {
  const paths = new Set(files.map(file => file.relativePath));
  const failures = [];
  for (const file of files.filter(file => file.relativePath.endsWith('.md'))) {
    const text = file.content.toString('utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const url = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z]+:|#|\/)/i.test(url)) continue;
      const target = decodeURIComponent(url.split('#')[0].split('?')[0]);
      if (!target) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.relativePath), target));
      if (resolved.startsWith('../') || (!paths.has(resolved) && ![...paths].some(p => p.startsWith(resolved.replace(/\/$/, '') + '/')))) failures.push(`${file.relativePath}: ${url}`);
    }
  }
  return failures;
}

async function treeFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await treeFiles(path.join(directory, entry.name), relativePath));
    else if (entry.isFile()) files.push({ relativePath, content: await readFile(path.join(directory, entry.name)) });
  }
  return files;
}

export async function verifyGuides(repoPath = root) {
  const { loadJsonc } = require(path.join(repoPath, 'packages/core/dist/manifest.js'));
  const { loadExternalSkillCatalog, resolveExternalSkillFiles } = require(path.join(repoPath, 'packages/core/dist/externalSkills.js'));
  const manifest = await loadJsonc(path.join(repoPath, 'agent-forge.manifest.jsonc'));
  const catalog = await loadExternalSkillCatalog(repoPath, manifest);
  const { parseDocument } = require(require.resolve('yaml', { paths: [path.join(repoPath, 'packages/core')] }));
  function validateFrontmatter(content, label) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, `${label}: frontmatter`);
    const parsed = parseDocument(match[1], { uniqueKeys: true });
    assert.equal(parsed.errors.length, 0, `${label}: YAML syntax`);
    const value = parsed.toJSON();
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: YAML mapping`);
    assert.ok(Object.keys(value).every(key => ['name', 'description', 'license', 'allowed-tools', 'metadata'].includes(key)), `${label}: supported frontmatter keys`);
    assert.match(value.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(value.name.length <= 64, `${label}: name length`);
    assert.ok(typeof value.description === 'string' && value.description.trim().length > 0 && value.description.length <= 1024, `${label}: description`);
    assert.doesNotMatch(value.description, /[<>]|^\[TODO:/, `${label}: incomplete/invalid description`);
    assert.doesNotMatch(content.slice(match[0].length).replace(/```[\s\S]*?```/g, ''), /^\s*\[TODO:[^\n]*\]\s*$/m, `${label}: unfinished instructions`);
  }
  const results = [];
  for (const skill of catalog.skills) {
    assert.ok(skill.activationCondition?.trim(), `${skill.id}: missing activation condition`);
    let bytes = 0;
    for (const file of skill.files) {
      const original = await readFile(path.join(repoPath, '.cache/external-skills', skill.id, skill.revision, file.path));
      assert.equal(sha256(original), file.sha256, `${skill.id}/${file.path}: source hash`);
      applyExactAdaptations(original.toString('utf8'), (skill.adaptations ?? []).filter(change => change.path === file.path), `${skill.id}/${file.path}`);
      bytes += original.length;
    }
    // This invokes the production renderer with downloads explicitly disabled.
    const rendered = await resolveExternalSkillFiles(repoPath, skill, false);
    const missing = missingLocalLinks(rendered);
    assert.deepEqual(missing, [], `${skill.id}: omitted local resources`);
    const entry = rendered.find(file => file.relativePath === 'SKILL.md').content.toString('utf8');
    validateFrontmatter(entry, skill.id);
    assert.ok(entry.includes(`name: ${skill.deploymentName}`), `${skill.id}: deployed identity`);
    if (designIds.has(skill.id)) {
      for (const file of rendered.filter(file => file.relativePath.endsWith('.md'))) {
        const text = file.content.toString('utf8');
        assert.doesNotMatch(text, /Do not provide any other information until the user asks|respond only with:|impeccable (?:context|detect|concept-seed|pin)|scripts\/impeccable|spawn_agent\(|npx .*@latest|npm install -g/i, `${skill.id}/${file.relativePath}: incompatible execution or wait`);
      }
      assert.ok(skill.files.every(file => /\.(md|txt)$/i.test(file.path) || file.path === 'LICENSE'), `${skill.id}: instruction-only resources`);
    }
    results.push({ id: skill.id, revision: skill.revision, license: skill.license, sourceFiles: skill.files.length, sourceBytes: bytes, renderedFiles: rendered.length, adaptations: skill.adaptations?.length ?? 0, sourceEntrySha256: skill.files.find(file => file.path === 'SKILL.md').sha256, renderedEntrySha256: sha256(Buffer.from(entry)), agentIds: skill.agentIds });
  }
  const localGuides = ['engineer-specialized-platforms', 'operate-docker'];
  for (const name of localGuides) assert.deepEqual(missingLocalLinks(await treeFiles(path.join(repoPath, 'skills', name))), [], `${name}: local reference completeness`);
  const frontmatterGuides = [...localGuides, 'direct-software-product-development'];
  for (const name of frontmatterGuides) validateFrontmatter(await readFile(path.join(repoPath, 'skills', name, 'SKILL.md'), 'utf8'), name);
  const scenarios = JSON.parse(await readFile(path.join(repoPath, 'evals/codex/skills/product-stack-conditions.json'), 'utf8'));
  assert.equal(scenarios.observedAgentRuns, false, 'Fixtures must not claim observed runs');
  assert.equal(new Set(scenarios.cases.map(item => item.id)).size, scenarios.cases.length, 'Unique scenario IDs');
  for (const scenario of scenarios.cases) assert.ok(scenario.prompt && scenario.expected.length > 0, 'Scenario input and expected behavior');
  for (const skill of catalog.skills) {
    const fixture = parseDocument(await readFile(path.join(repoPath, 'evals/codex/skills', `${skill.deploymentName}.yaml`), 'utf8'));
    assert.equal(fixture.errors.length, 0, `${skill.id}: fixture YAML syntax`);
    const data = fixture.toJSON();
    assert.equal(data.id, skill.deploymentName, `${skill.id}: fixture identity`);
    assert.ok(data.prompt && data.explicitPrompt && data.negativePrompt, `${skill.id}: activation fixture cases`);
  }
  return { kind: 'static-guide-verification', observedAt: new Date().toISOString(), catalogSha256: sha256(await readFile(path.join(repoPath, 'config/external-skills.json'))), productionRenderer: true, networkDownloads: false, results, localGuides, frontmatterGuides, staticScenarioCount: scenarios.cases.length, limitations: ['Does not execute or evaluate agent behavior.', 'Does not establish design quality, browser/native behavior, hook trust, or installation in a Codex client.'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifyGuides();
  if (process.argv[2]) {
    const output = path.resolve(root, process.argv[2]);
    const cacheRoot = path.join(root, '.cache');
    assert.ok(output.startsWith(cacheRoot + path.sep), 'Evidence output must stay in the ignored repository cache');
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify({ ...result, results: result.results.map(({ id, sourceFiles, renderedFiles, adaptations }) => ({ id, sourceFiles, renderedFiles, adaptations })) }, null, 2));
}
