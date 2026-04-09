import { execFileSync } from 'node:child_process';
import * as os from 'node:os';

export interface HardwareInfo {
  gpu: string | null;
  vramMB: number;
  ramMB: number;
}

export type ImageRuntime = 'diffusers' | 'ollama';

export interface ImageModelTier {
  minVram: number;
  model: string;         // HuggingFace model ID for diffusers
  ollamaModel?: string;  // Ollama model name (for when Ollama ships Windows/Linux image gen)
  pipelineClass: string; // diffusers pipeline class name
  description: string;
}

/**
 * Sorted descending by minVram. First match wins.
 * Models are HuggingFace IDs for diffusers pipeline.
 * Ollama image gen is macOS-only as of Jan 2026; Windows/Linux coming soon.
 */
export const IMAGE_MODEL_TIERS: ImageModelTier[] = [
  {
    minVram: 12_000,
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    pipelineClass: 'StableDiffusionXLPipeline',
    description: 'SDXL base — best quality, requires 12 GB+ VRAM',
  },
  {
    minVram: 6_000,
    model: 'ByteDance/SDXL-Lightning',
    ollamaModel: undefined,
    pipelineClass: 'StableDiffusionXLPipeline',
    description: 'SDXL Lightning 4-step — high quality, fast inference, 6 GB+ VRAM',
  },
  {
    minVram: 4_000,
    model: 'stable-diffusion-v1-5/stable-diffusion-v1-5',
    pipelineClass: 'StableDiffusionPipeline',
    description: 'SD 1.5 — lightweight, 4 GB VRAM minimum',
  },
  {
    minVram: 0,
    model: 'stable-diffusion-v1-5/stable-diffusion-v1-5',
    pipelineClass: 'StableDiffusionPipeline',
    description: 'SD 1.5 CPU — no GPU required, very slow',
  },
];

export function detectHardware(): HardwareInfo {
  const ramMB = Math.round(os.totalmem() / (1024 * 1024));

  // Try NVIDIA first
  try {
    const out = execFileSync('nvidia-smi', [
      '--query-gpu=name,memory.total',
      '--format=csv,noheader,nounits',
    ], { encoding: 'utf-8', timeout: 5_000 });

    const line = out.trim().split('\n')[0];
    if (line) {
      const [name, vramStr] = line.split(',').map(s => s.trim());
      const vramMB = parseInt(vramStr, 10);
      if (name && !Number.isNaN(vramMB)) {
        return { gpu: name, vramMB, ramMB };
      }
    }
  } catch {
    // nvidia-smi not available or failed
  }

  // TODO: Add AMD GPU detection (rocm-smi) if needed

  return { gpu: null, vramMB: 0, ramMB };
}

export function selectImageModel(vramMB: number): { model: string; pipelineClass: string; description: string } {
  for (const tier of IMAGE_MODEL_TIERS) {
    if (vramMB >= tier.minVram) {
      return { model: tier.model, pipelineClass: tier.pipelineClass, description: tier.description };
    }
  }
  // Fallback — should never reach here since last tier has minVram: 0
  const last = IMAGE_MODEL_TIERS[IMAGE_MODEL_TIERS.length - 1];
  return { model: last.model, pipelineClass: last.pipelineClass, description: last.description };
}

export function selectImageRuntime(): ImageRuntime {
  // Ollama image gen is macOS only as of Jan 2026
  if (process.platform === 'darwin') {
    try {
      execFileSync('ollama', ['--version'], { stdio: 'ignore', timeout: 3_000 });
      return 'ollama';
    } catch { /* fall through */ }
  }
  return 'diffusers';
}
