import * as os from 'node:os';
import * as path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import type { CodexEnvironment } from './types.js';
import { diagnostic } from './diagnostics.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

export async function discoverCodexEnvironment(options: { env?: NodeJS.ProcessEnv } = {}): Promise<CodexEnvironment> {
  const env = options.env ?? process.env;
  const userProfile = env.USERPROFILE || env.HOME || os.homedir();
  const codexHome = env.CODEX_HOME || path.join(userProfile, '.codex');
  const integrationDetected = await exists(codexHome);
  const diagnostics = integrationDetected ? [] : [diagnostic('AF010', 'error', 'OpenAI Codex integration was not detected for this user profile')];
  let availableModels: string[] | undefined;
  let availableReasoningEfforts: Record<string, string[]> | undefined;
  let modelCatalogSource: string | undefined;
  const modelCachePath = path.join(codexHome, 'models_cache.json');
  if (await exists(modelCachePath)) {
    try {
      const cache: unknown = JSON.parse(await readFile(modelCachePath, 'utf8'));
      if (!cache || typeof cache !== 'object' || !Array.isArray((cache as { models?: unknown }).models)) throw new Error('Expected a models array');
      const entries = (cache as { models: unknown[] }).models;
      availableModels = [];
      availableReasoningEfforts = {};
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const model = entry as { slug?: unknown; visibility?: unknown; supported_reasoning_levels?: unknown };
        if (typeof model.slug !== 'string' || !model.slug || model.visibility === 'hide') continue;
        availableModels.push(model.slug);
        if (Array.isArray(model.supported_reasoning_levels)) {
          availableReasoningEfforts[model.slug] = model.supported_reasoning_levels.flatMap(level =>
            level && typeof level === 'object' && typeof level.effort === 'string' ? [level.effort] : []);
        }
      }
      modelCatalogSource = modelCachePath;
      diagnostics.push(diagnostic('AF011', 'info', 'Model availability was read from the local Codex cache; successful execution in each client remains a separate check', { path: modelCachePath }));
    } catch {
      diagnostics.push(diagnostic('AF011', 'warning', 'Codex model cache could not be read; model execution availability is unverified', { path: modelCachePath }));
    }
  }
  return {
    supported: integrationDetected,
    userProfile,
    codexHome,
    agentsTarget: path.join(codexHome, 'agents'),
    skillsTarget: path.join(userProfile, '.agents', 'skills'),
    integrationDetected,
    availableModels,
    availableReasoningEfforts,
    modelCatalogSource,
    diagnostics,
  };
}
