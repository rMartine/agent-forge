---
name: generate-logo
description: "Generate logo concepts using SDXL Lightning. Use when creating brand marks, app icons, project logos, or identity assets from text prompts."
argument-hint: "Describe the logo (e.g., 'minimalist anvil with sparks, forge orange on dark background')"
---

# Generate Logo

Create logo concepts using SDXL Lightning (4-step) running locally via Python `diffusers`.

## When to Use

- Creating a new project logo or brand mark
- Generating app icon concepts
- Exploring visual identity directions
- Producing icon variations for selection

## Prerequisites

- Python 3.11+ with `diffusers`, `transformers`, `torch`, `accelerate`, `safetensors`, `Pillow`, `huggingface_hub`
- NVIDIA GPU with 6+ GB VRAM (check `torch.cuda.is_available()`)
- SDXL base + Lightning UNet downloaded (check `Agent Forge: Select Image Model` or `agentForge.imageModelStoragePath` setting)

## Procedure

### 1. Gather Logo Requirements

Ask the user for:
- **Subject** — What should the logo depict? (e.g., "anvil with sparks", "abstract neural network")
- **Style** — Flat vector, 3D, minimalist, detailed, geometric, organic?
- **Palette** — Specific colors or mood (e.g., "forge orange and steel gray on dark background")
- **Context** — Where will it be used? (app icon, website header, marketing)
- **Constraints** — Must it work at small sizes? Light and dark backgrounds? Monochrome variant needed?

### 2. Craft the Prompt

Build a structured prompt following this pattern:

```
Subject: [main element], [secondary elements]
Style: flat vector illustration, clean lines, minimal, [additional style cues]
Composition: centered, square format, icon-only (no text)
Color: [specific palette], [background color]
Quality: sharp edges, professional quality, scalable
Negative: photorealistic, 3D render, text, watermark, blurry, busy, complex, low quality
```

### 3. Generate Variations

Create a Python script in the project's `generated/logo/` directory:

```python
import torch
from diffusers import StableDiffusionXLPipeline, EulerDiscreteScheduler
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file
import os

# Model configuration
# If agentForge.imageModelStoragePath is set, use it as HF_HOME
# Default: ~/.agent-forge/models
MODEL_STORAGE = os.environ.get("HF_HOME", os.path.expanduser("~/.agent-forge/models"))
os.environ["HF_HOME"] = MODEL_STORAGE

BASE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
LIGHTNING_REPO = "ByteDance/SDXL-Lightning"
LIGHTNING_CKPT = "sdxl_lightning_4step_unet.safetensors"

# Load pipeline
pipe = StableDiffusionXLPipeline.from_pretrained(
    BASE_MODEL, torch_dtype=torch.float16, variant="fp16"
)
pipe.unet.load_state_dict(
    load_file(hf_hub_download(LIGHTNING_REPO, LIGHTNING_CKPT), device="cpu")
)
pipe.scheduler = EulerDiscreteScheduler.from_config(
    pipe.scheduler.config, timestep_spacing="trailing"
)
pipe = pipe.to("cuda")

# Prompt
PROMPT = "YOUR PROMPT HERE"
NEGATIVE = "photorealistic, 3D, text, watermark, blurry, low quality, complex"

# Generate 4 variations with different seeds
SEEDS = [42, 137, 256, 512]
for seed in SEEDS:
    image = pipe(
        prompt=PROMPT,
        negative_prompt=NEGATIVE,
        num_inference_steps=4,
        guidance_scale=0.0,
        width=1024,
        height=1024,
        generator=torch.Generator("cuda").manual_seed(seed),
    ).images[0]

    filename = f"logo_seed{seed}.png"
    image.save(filename)
    print(f"Saved {filename} (seed={seed})")
```

Always generate at least 4 variations with different seeds.

### 4. Present Results

Show all generated variations to the user:
- Display each image with its seed number
- Note visual differences between variations
- Recommend the best candidate with rationale (composition, readability at small size, color impact)

### 5. Iterate if Needed

If the user wants changes:
- Adjust the prompt (add/remove style cues, change colors)
- Try different seeds
- Adjust negative prompt to eliminate unwanted elements
- Consider changing dimensions for different aspect ratios

### 6. Finalize

Once the user selects a logo:
- Copy the selected PNG to the appropriate project location (e.g., `packages/extension/media/`)
- Log the prompt, seed, and parameters in `generated/logo/prompts.md`
- Note that a vector SVG version should be created as a follow-up (raster logos don't scale)

## Output Dimensions

| Use Case | Dimensions |
|----------|-----------|
| App icon / logo | 1024x1024 |
| Favicon source | 512x512 |
| Social media profile | 800x800 |
| Wide banner logo | 1024x512 |

## Constraints

- ALWAYS log prompt, seed, steps, CFG, and dimensions for every generation.
- ALWAYS generate multiple variations (minimum 4) for user selection.
- ALWAYS set `HF_HOME` to the configured model storage path before loading.
- DO NOT include text in logos — diffusion models produce unreliable text. Text should be added in post-processing.
- DO NOT use copyrighted references, brand names, or artist names in prompts.
- DO NOT skip the negative prompt — it significantly improves output quality.
- DO NOT present a single option. Always give the user choices.
