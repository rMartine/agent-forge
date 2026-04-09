"""Agent Forge logo generation via SDXL Lightning 4-step."""
import torch
from diffusers import StableDiffusionXLPipeline, EulerDiscreteScheduler
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file

BASE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
LIGHTNING_REPO = "ByteDance/SDXL-Lightning"
LIGHTNING_CKPT = "sdxl_lightning_4step_unet.safetensors"
OUTPUT_DIR = "d:/Proyectos/agent-forge/generated/logo"

# Hammer-striking-sparks concept: forge theme
# Colors: forge orange #E8772E, spark gold #FFB830, anvil steel #6B7B8D
PROMPT = (
    "a minimalist logo icon of a blacksmith hammer striking an anvil with bright sparks flying, "
    "flat vector illustration style, geometric shapes, clean bold lines, "
    "forge orange and gold sparks on dark steel gray background, "
    "centered composition, square format, icon-only no text, "
    "professional logo design, scalable, high contrast, sharp edges, "
    "modern tech aesthetic, dark background"
)

NEGATIVE_PROMPT = (
    "photorealistic, 3D render, text, letters, words, watermark, signature, "
    "blurry, low quality, noisy, complex, busy, gradient, photograph, "
    "human face, hands, fingers, realistic fire"
)

SEEDS = [42, 137, 256, 512]
STEPS = 4       # SDXL Lightning is optimized for 4 steps
GUIDANCE = 0.0  # Distilled model — no classifier-free guidance needed
WIDTH = 1024
HEIGHT = 1024

def main():
    print(f"Loading SDXL base from {BASE_MODEL}...")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        variant="fp16",
    )

    print(f"Downloading Lightning UNet from {LIGHTNING_REPO}...")
    unet_path = hf_hub_download(LIGHTNING_REPO, LIGHTNING_CKPT)
    print(f"Loading Lightning UNet weights...")
    pipe.unet.load_state_dict(load_file(unet_path, device="cpu"))

    pipe.scheduler = EulerDiscreteScheduler.from_config(
        pipe.scheduler.config, timestep_spacing="trailing"
    )
    pipe = pipe.to("cuda")

    for seed in SEEDS:
        print(f"Generating seed={seed}...")
        generator = torch.Generator("cuda").manual_seed(seed)
        image = pipe(
            prompt=PROMPT,
            negative_prompt=NEGATIVE_PROMPT,
            num_inference_steps=STEPS,
            guidance_scale=GUIDANCE,
            width=WIDTH,
            height=HEIGHT,
            generator=generator,
        ).images[0]

        filename = f"{OUTPUT_DIR}/logo_lightning_seed{seed}.png"
        image.save(filename)
        print(f"  Saved: {filename}")

    print("Done. 4 SDXL Lightning variations generated.")

if __name__ == "__main__":
    main()
