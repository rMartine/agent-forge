---
name: agent-forge-copilot-elevenlabs-creative-studio
description: Produce and edit authorized ElevenLabs creative media through its authenticated MCP server with schema discovery and tracked job outputs.
---

# ElevenLabs creative production

Use the VS Code MCP server whose endpoint is `https://api.elevenlabs.io/v1/mcp`.
Authentication is completed through VS Code's OAuth flow. Never use credentials
from another application's configuration. Tools and schemas must be discovered
from that server at runtime; this skill intentionally does not invent tool IDs.

1. Establish the requested deliverable: modality, aspect ratio/duration, audience,
   language, brand/style constraints, source assets and output format. Read any
   authorized source material first. Use `assets/production-brief.json` to preserve
   requirements and assign each planned asset a stable local ID.
2. Read the server's live tool descriptions and schemas. Locate capabilities for
   model/catalog discovery, generation/editing, task status and retrieving results.
   Confirm the requested modality and supplied file format are supported. Record
   the actual server tool names and model identifiers in the production ledger.
3. For narration use agent-forge-copilot-elevenlabs-text-to-speech; for transcripts
   use agent-forge-copilot-elevenlabs-speech-to-text. For images, music, effects,
   dubbing or video use the matching discovered capability and its documented inputs.
   Preserve the source asset for edits and use only actual accessible asset URLs.
4. Prepare the final prompt/script, model, source references and settings before
   calling generation. A request to install or configure is not a request to spend
   credits. Respect the user's generation scope and budget; if a required creative
   choice is missing choose a defensible default and disclose it.
5. Submit each authorized job once. Save returned task/asset IDs immediately. Poll
   the corresponding status capability at its recommended interval; do not resubmit
   after a timeout with an unknown outcome. Recover the original job status first.
6. On success, retrieve the result through server-supported export/download tools.
   Use local returned media or the actual result URL. Inspect dimensions, duration,
   content and sound as available. When a preview is unavailable state that rather
   than claiming visual or auditory review. Keep the editable project ID when given.
7. Deliver playable/viewable media plus source/asset provenance, selected settings
   and remaining revisions. Only share, publish or delete projects when requested.

If authentication, quota or capability discovery blocks the task, retain the brief
and scripts locally and report the exact pending step. Do not fabricate a completed
asset. Official connection source: https://elevenlabs.io/mcp
