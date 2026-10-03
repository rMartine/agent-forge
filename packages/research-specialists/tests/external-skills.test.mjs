import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const expectedSkills = [
  'literature-review', 'scientific-critical-thinking', 'citation-management',
  'experimental-design', 'statistical-analysis', 'scientific-visualization',
  'nature-writing', 'nature-response', 'nature-shared',
];

test('the selected external resources have exact original and installed hashes', () => {
  const registry = JSON.parse(readFileSync(path.join(root, 'provenance', 'external-sources.json'), 'utf8'));
  assert.deepEqual([...registry.skills].map(skill => skill.name).sort(), [...expectedSkills].sort());
  for (const skill of registry.skills) {
    assert.match(skill.upstreamCommit, /^[a-f0-9]{40}$/);
    assert.ok(skill.files.length > 0);
    for (const file of skill.files) {
      assert.match(file.originalSha256, /^[a-f0-9]{64}$/);
      const actual = createHash('sha256').update(readFileSync(path.join(root, file.installedPath))).digest('hex');
      assert.equal(actual, file.adaptedSha256, file.installedPath);
    }
    assert.ok(existsSync(path.join(root, skill.licensePath)));
  }
});

test('the external selection contains no upstream installer or automatic updater', () => {
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
  for (const name of expectedSkills) {
    assert.ok(existsSync(path.join(root, 'skills', name, 'SKILL.md')));
    assert.ok(!walk(path.join(root, 'skills', name)).some(file => /(?:autoupdate|update-codex-skills)\.sh$/.test(file)));
  }
});
