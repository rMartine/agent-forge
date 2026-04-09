# Graphic Designer – TODO

## Vector Logo

The current extension icon (`packages/extension/media/agent-forge-icon.png`) is a raster image generated via SDXL Lightning. A proper vector version is needed:

- [ ] Recreate the logo as SVG using the seed-42 design (anvil + flame, forge orange/gold/steel palette) as reference
- [ ] Produce activity-bar-ready monochrome SVG variant (single path, no fills) to replace `media/agent-forge.svg`
- [ ] Export optimized PNG at 128×128 and 256×256 for marketplace use
- [ ] Provide dark/light theme variants for the activity bar icon

## Image Generation Flows

The current pipeline is a single-shot text-to-image script. Expand it to support more complex workflows:

- [ ] **img2img refinement** – take a rough sketch or low-res generation and upscale/refine with SDXL Lightning img2img
- [ ] **ControlNet integration** – generate images guided by edge maps, depth maps, or pose skeletons for consistent branding assets
- [ ] **Batch variations** – parameterized batch runs with prompt interpolation for exploring design spaces
- [ ] **Inpainting** – selectively regenerate regions of an existing image (e.g., swap background, fix artifacts)
- [ ] **Style transfer** – apply a consistent brand style (colors, textures) across multiple generated assets
- [ ] **Automated post-processing** – background removal, palette normalization, format conversion (PNG → SVG trace, WebP)

## Priority

Vector logo is **P1** — the raster icon works but does not scale cleanly at small sizes and cannot be themed by VS Code for the activity bar.

Image generation flows are **P2** — useful for producing branded assets at scale but not blocking the MVP.
