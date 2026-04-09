---
name: search-stock-images
description: "Search the web for royalty-free stock images from Unsplash, Pexels, and Pixabay. Use when you need reference images, placeholder art, or ready-to-use photography and illustrations for projects."
argument-hint: "Describe what you're looking for (e.g., 'dark background with orange sparks and metal textures')"
---

# Search Stock Images

Find royalty-free images from open stock photo platforms. Returns direct URLs and license info.

## When to Use

- Need reference images for design direction or mood boards
- Need placeholder photography for UI mockups or marketing materials
- Need ready-to-use images where generation is overkill
- Need textures, patterns, or backgrounds as inputs for img2img refinement

## Procedure

### 1. Build Search Queries

Translate the user's request into effective search terms:
- Use 2-4 specific keywords (e.g., "forge anvil sparks dark background")
- Add style qualifiers when relevant: "minimal", "flat lay", "aerial", "abstract"
- For color-specific searches, include the color: "orange abstract texture"

### 2. Search Multiple Platforms

Search at least two of these free stock platforms for breadth:

| Platform | URL Pattern | License |
|----------|-------------|---------|
| **Unsplash** | `https://unsplash.com/s/photos/{query}` | Unsplash License (free for commercial use, no attribution required) |
| **Pexels** | `https://www.pexels.com/search/{query}/` | Pexels License (free for commercial use, no attribution required) |
| **Pixabay** | `https://pixabay.com/images/search/{query}/` | Pixabay Content License (free for commercial use) |

Use the `web` tool to search and the `browser` tool to fetch results from these platforms.

### 3. Collect Results

For each relevant image found, record:
- **Thumbnail URL** — for preview
- **Full-resolution download URL** — for use
- **Photographer / Author** — for optional attribution
- **Platform** — where it was found
- **License** — confirm it's royalty-free

### 4. Present to User

Present results as a numbered list with:
1. Description of the image
2. Platform and photographer
3. Direct link
4. License summary

Example:
```
1. Dark metal anvil with orange sparks — Unsplash, by @john_smith
   https://unsplash.com/photos/abc123
   License: Unsplash (free for commercial use)

2. Molten metal pouring in foundry — Pexels, by Jane Doe
   https://www.pexels.com/photo/456789/
   License: Pexels (free for commercial use)
```

### 5. Download Selected Images

When the user picks an image:
- Download to the project's `generated/` directory with a descriptive filename
- Log the source URL, author, and license in a `sources.md` file alongside the download
- Respect the platform's hotlinking policy — always download, never hotlink

## Constraints

- ONLY use royalty-free platforms. Never scrape Google Images or use rights-managed stock.
- ALWAYS record attribution even when not legally required. It's good practice.
- DO NOT present more than 8 results per search. Curate the best matches.
- DO NOT download images without user approval first.
- DO NOT use images that contain watermarks, visible logos, or identifiable people without model releases.
