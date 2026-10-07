import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderRosterEdition } from '../dist/rosterAdapters.js';

const contractPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'opencode-v2-plugin-contract.json');

const catalog = {
  schemaVersion: 1,
  rosters: [{ id: 'development', name: 'Development', coordinatorId: 'director', coordinationSkill: 'guide' }],
  agents: [{ id: 'reviewer', roster: 'development', description: 'Review', body: 'Review evidence.', sourcePath: 'roles/reviewer.md', readOnly: true, coordinator: false, skills: ['guide'], completionEvidence: ['Evidence'], delegation: 'allowed' }],
  resources: [{ id: 'guide/SKILL.md', roster: 'development', kind: 'skill', sourcePath: 'skills/guide/SKILL.md', relativePath: 'guide/SKILL.md', content: Buffer.from('---\nname: guide\ndescription: guide\n---\nUse evidence.\n'), dependency: false, adaptation: 'prose' }],
  aliases: {},
  diagnostics: [],
};

test('OpenCode V2 plugin injects context through the automatic hook and declares lifecycle limitations', async () => {
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  assert.equal(contract.version, 'V2');
  assert.match(contract.reviewedDate, /^2026-\d{2}-\d{2}$/);
  assert.deepEqual(contract.sources, [
    'https://opencode.ai/v2/docs/build/plugins/',
    'https://opencode.ai/v2/docs/agents/',
    'https://opencode.ai/v2/docs/permissions/',
  ]);
  const root = path.join(os.tmpdir(), 'agent-forge-opencode-contract');
  const rendered = await renderRosterEdition(catalog, 'opencode', {
    repoPath: root,
    agentRoot: path.join(root, 'agents'),
    skillRoot: path.join(root, 'skills'),
    runtimeRoot: path.join(root, 'runtime'),
    portable: true,
  });
  const pluginSource = rendered.files.find(file => file.id === 'opencode-plugin').content.toString('utf8');
  assert.match(pluginSource, new RegExp(`${contract.plugin.defaultExport}\\(`));
  for (const registration of contract.plugin.registrations) {
    assert.match(pluginSource, new RegExp(`ctx\\.${registration.domain}\\.${registration.method}\\('${registration.event}'`));
    for (const field of registration.accessedFields) assert.match(pluginSource, new RegExp(`event\\.${field}`), `plugin should use documented ${registration.event} field ${field}`);
  }
  assert.match(pluginSource, new RegExp(`\\.${contract.plugin.registrationDisposeMethod}\\(\\)`));

  const executable = pluginSource.replace("import { Plugin } from '@opencode/plugin';", 'const Plugin = { define: value => value };');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(executable).toString('base64')}`;
  const plugin = await import(moduleUrl);
  const calls = [], registrations = {};
  const ctx = {
    session: { hook: async (name, callback) => { calls.push(`session:${name}`); registrations.context = callback; return { dispose: async () => calls.push('session:disposed') }; } },
    permission: { hook: async (name, callback) => { calls.push(`permission:${name}`); registrations.permission = callback; return { dispose: async () => calls.push('permission:disposed') }; } },
  };
  const cleanup = await plugin.default.setup(ctx);
  assert.deepEqual(calls, ['permission:evaluate', 'session:context']);

  const event = { agent: 'reviewer', system: [], tools: {}, prompt: ['existing prompt'], permissions: { edit: 'deny' }, toolCalls: [{ name: 'read' }] };
  for (const field of contract.plugin.registrations[0].fields) assert.ok(field in event, `context event fixture has documented field ${field}`);
  const result = await registrations.context(event);
  assert.equal(result, undefined);
  assert.equal(event.system.length, 1);
  assert.match(event.system[0].text, /You may delegate to any suitable available agent/);
  assert.match(event.system[0].text, /authorization-boundaries/);
  assert.deepEqual(event.prompt, ['existing prompt']);
  assert.deepEqual(event.permissions, { edit: 'deny' });
  assert.deepEqual(event.toolCalls, [{ name: 'read' }]);

  const readAllowed = { agent: 'reviewer', action: 'read', resources: [], effect: 'ask', message: undefined };
  for (const field of contract.plugin.registrations[1].fields) assert.ok(field in readAllowed, `permission event fixture has documented field ${field}`);
  registrations.permission(readAllowed);
  assert.equal(readAllowed.effect, 'ask');
  const readDenied = { agent: 'reviewer', action: 'edit', resources: [] };
  registrations.permission(readDenied);
  assert.equal(readDenied.effect, 'deny');
  const readonlyChildAllowed = { agent: 'reviewer', action: 'subagent', resources: ['reviewer'], effect: 'ask' };
  registrations.permission(readonlyChildAllowed);
  assert.equal(readonlyChildAllowed.effect, 'ask');
  const writableChildDenied = { agent: 'reviewer', action: 'subagent', resources: ['director'] };
  registrations.permission(writableChildDenied);
  assert.equal(writableChildDenied.effect, 'deny');
  const unknownActorDenied = { action: 'edit', resources: [] };
  registrations.permission(unknownActorDenied);
  assert.equal(unknownActorDenied.effect, 'deny');
  const existingGlobalDeny = { agent: 'reviewer', action: 'read', resources: [], effect: 'deny', message: 'global policy' };
  registrations.permission(existingGlobalDeny);
  assert.equal(existingGlobalDeny.effect, contract.plugin.registrations[1].explicitDenyIsFinal ? 'deny' : existingGlobalDeny.effect);
  const writableActorUnchanged = { agent: 'director', action: 'edit', resources: [] };
  registrations.permission(writableActorUnchanged);
  assert.equal(writableActorUnchanged.effect, undefined);

  await cleanup();
  assert.deepEqual(calls, ['permission:evaluate', 'session:context', 'permission:disposed', 'session:disposed']);
  assert.equal(/ctx\.(?:tool|command)\s*\(|event\.toolCalls\s*=/.test(pluginSource), false);

  const coverage = JSON.parse(rendered.files.find(file => file.id === 'hook-coverage').content.toString('utf8'));
  assert.equal(coverage.observed, false);
  assert.match(coverage.limitations.join('\n'), /Context hook is automatic/);
  assert.match(coverage.limitations.join('\n'), /lifecycle and tool authorization require explicit verified identities/);
  assert.match(coverage.limitations.join('\n'), /unsupported native event mappings are not fabricated/);
  assert.match(coverage.limitations.join('\n'), /readonly parents can target only canonical readonly profiles/);
  assert.equal(coverage.observed, false, 'contract validation must not claim live OpenCode verification');
  assert.match(coverage.limitations.join('\n'), /no client installed or live execution observed/);
  assert.ok(contract.plugin.limitations.some(limitation => /does not verify a live OpenCode installation or model availability/.test(limitation)));
});
