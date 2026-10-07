import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRosterCatalog } from '../dist/index.js';
import { renderRosterEdition, catalogFingerprint } from '../dist/rosterAdapters.js';
import { hashBuffer } from '../dist/hash.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('canonical catalog contains four rosters, 45 agents and 70 skills with resolvable content', async () => {
  const catalog = await loadRosterCatalog(repo);
  assert.equal(catalog.rosters.length, 4);
  assert.equal(catalog.agents.length, 45);
  assert.equal(catalog.agents.filter(agent => agent.coordinator).length, 4);
  assert.equal(catalog.agents.filter(agent => !agent.coordinator).length, 41);

  const skillIds = new Set(catalog.resources
    .filter(resource => resource.kind === 'skill')
    .map(resource => resource.relativePath.replaceAll('\\', '/').split('/')[0]));
  assert.equal(skillIds.size, 70);
  assert.equal(catalog.resources.filter(resource => resource.kind === 'skill').length > skillIds.size, true);
  assert.equal(new Set(catalog.resources.map(resource => resource.id)).size, catalog.resources.length);
  for (const resource of catalog.resources) {
    assert.ok(resource.content.length > 0, `${resource.id} must not be empty`);
  }
  const repeated = await loadRosterCatalog(repo);
  assert.deepEqual(
    repeated.resources.map(resource => [resource.id, hashBuffer(resource.content)]),
    catalog.resources.map(resource => [resource.id, hashBuffer(resource.content)]),
    'the same pinned/source resources must load to the same bytes',
  );
});

test('all editions render the same canonical inventory deterministically', async () => {
  const catalog = await loadRosterCatalog(repo);
  const fingerprint = catalogFingerprint(catalog);
  const identities = [];

  for (const edition of ['codex', 'vscode', 'opencode']) {
    const context = {
      repoPath: repo,
      agentRoot: path.join(repo, '.cache/qa-tests', edition, 'agents'),
      skillRoot: path.join(repo, '.cache/qa-tests', edition, 'skills'),
      runtimeRoot: path.join(repo, '.cache/qa-tests', edition, 'runtime'),
      portable: true,
    };
    const first = await renderRosterEdition(catalog, edition, context);
    const second = await renderRosterEdition(catalog, edition, context);
    assert.deepEqual(second, first, `${edition} output must be deterministic`);
    const inventory = JSON.parse(first.files.find(file => file.id === 'edition-inventory').content.toString('utf8'));
    assert.equal(inventory.canonicalFingerprint, fingerprint);
    assert.deepEqual(inventory.agents.map(agent => agent.id).sort(), catalog.agents.map(agent => agent.id).sort());
    assert.deepEqual([...inventory.skills].sort(), [...new Set(catalog.resources.filter(resource => resource.kind === 'skill').map(resource => resource.relativePath.replaceAll('\\', '/').split('/')[0]))].sort());
    assert.equal(inventory.hookPolicies.length > 0, true);
    if (edition === 'opencode') {
      const read = id => first.files.find(file => file.id === id)?.content.toString('utf8');
      const elevenLabsGuide = read('skill/independent-elevenlabs/SKILL.md');
      assert.ok(elevenLabsGuide, 'OpenCode edition must include the independent ElevenLabs guide');
      for (const skillId of ['agent-forge-elevenlabs-creative-studio', 'agent-forge-elevenlabs-text-to-speech', 'agent-forge-elevenlabs-speech-to-text']) {
        assert.ok(first.files.some(file => file.id === `skill/${skillId}/SKILL.md`), `portable OpenCode skill ${skillId} must be emitted`);
        assert.ok(elevenLabsGuide.includes(path.join(context.skillRoot, skillId, 'SKILL.md').replaceAll('\\', '/')));
      }
      assert.doesNotMatch(elevenLabsGuide, /four variants by default|Codex|\.codex[\\/]|openai\/codex/i);

      const latexGuide = read('skill/agent-forge-research-research-latex/SKILL.md');
      assert.ok(latexGuide, 'OpenCode edition must adapt the research LaTeX procedure');
      assert.ok(first.files.some(file => file.id === 'skill/agent-forge-latex/SKILL.md'));
      assert.ok(latexGuide.includes(path.join(context.skillRoot, 'agent-forge-latex', 'SKILL.md').replaceAll('\\', '/')));
      assert.doesNotMatch(latexGuide, /Codex|\.codex[\\/]|openai\/codex/i);
    }
    identities.push(inventory.canonicalFingerprint);
  }

  assert.equal(new Set(identities).size, 1);
});
