import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverVsCodeEnvironment, isSupportedVsCodeVersion } from '../dist/index.js';

test('VS Code 1.104 is the minimum supported version', () => {
  assert.equal(isSupportedVsCodeVersion('1.103.9'), false);
  assert.equal(isSupportedVsCodeVersion('1.104.0'), true);
});

test('environment discovery is deterministic with injected environment values', async () => {
  const result = await discoverVsCodeEnvironment({ env: {
    USERPROFILE: 'C:\\test-profile',
    AGENT_FORGE_VSCODE_VERSION: '1.104.2',
    AGENT_FORGE_AVAILABLE_TOOLS: 'github/get_file_contents,docker/containers-list',
    AGENT_FORGE_AVAILABLE_MODELS: 'model-a',
  } });
  assert.equal(result.supported, true);
  assert.deepEqual(result.availableModels, ['model-a']);
  assert.match(result.targets.agents, /\.copilot[\\/]agents$/);
});
