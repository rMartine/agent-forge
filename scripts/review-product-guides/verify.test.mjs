import assert from 'node:assert/strict';
import test from 'node:test';
import { applyExactAdaptations, missingLocalLinks } from './verify.mjs';

test('adaptations reject upstream drift and duplicate anchors instead of silently patching', () => {
  assert.equal(applyExactAdaptations('old', [{ find: 'old', replace: 'new' }], 'fixture'), 'new');
  assert.throws(() => applyExactAdaptations('changed', [{ find: 'old', replace: 'new' }], 'fixture'), /match once/);
  assert.throws(() => applyExactAdaptations('old old', [{ find: 'old', replace: 'new' }], 'fixture'), /match once/);
});

test('relative references are checked transitively and cannot escape the deployed guide', () => {
  const files = [
    { relativePath: 'SKILL.md', content: '[Read](references/one.md) [Remote](https://example.com) `![Generated example](./after.png)`' },
    { relativePath: 'references/one.md', content: '[More](two.md) [Outside](../../other.md)' }
  ];
  assert.deepEqual(missingLocalLinks(files), ['references/one.md: two.md', 'references/one.md: ../../other.md']);
  files[1].content = '[More](two.md#section)';
  files.push({ relativePath: 'references/two.md', content: '# Section' });
  assert.deepEqual(missingLocalLinks(files), []);
});
