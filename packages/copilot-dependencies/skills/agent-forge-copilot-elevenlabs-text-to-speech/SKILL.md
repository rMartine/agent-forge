---
name: agent-forge-copilot-elevenlabs-text-to-speech
description: Convert authorized scripts to speech using discovered ElevenLabs MCP voices and models, preserving pronunciation, segment order and output evidence.
---

# Text to speech

Use authenticated MCP at `https://api.elevenlabs.io/v1/mcp`. Discover the server's
actual tools for voices, supported speech models, speech generation and task/output
retrieval. Use only schemas and IDs returned by that server.

1. Read the final script, audience, language/accent, desired voice, tone, duration and
   output format. Preserve the intended meaning. Expand ambiguous numbers, dates,
   acronyms and names for spoken clarity with the user-provided pronunciation.
2. Query available voices/models. Select the requested voice by verified identifier;
   otherwise choose a suitable available voice and disclose the choice. Never infer
   that a named real person's voice may be cloned. Use only authorized voice assets.
3. Verify the selected model's limits and supported settings in the live schema.
   Split long scripts at natural paragraph boundaries within character limits.
   Keep a segment ledger with index, exact text, voice/model and intended pauses.
   Voice consistency and sentence continuity take precedence over arbitrary size.
4. Send authorized text through the discovered speech-generation tool. Preserve
   returned task IDs, request IDs and result references per segment. Follow the
   documented asynchronous status workflow if applicable. Do not duplicate a job
   whose response timed out until its state is known.
5. Retrieve actual audio and, when available, alignment timestamps. Inspect duration
   and listen when playback is available. Check pronunciation, missing phrases,
   clipped edges, inconsistent loudness and pauses. State if listening was unavailable.
6. Concatenate segments only with an available local audio tool and a format-compatible
   workflow; preserve originals and order. Do not simply concatenate MP3 bytes. Use
   ffmpeg if installed and authorized, or deliver ordered segment files.
7. Deliver playable audio, final spoken script, voice/model/settings and any corrected
   segments. Include timestamps when returned. A generation request uses credits;
   installation verification never generates a voice sample.

Connection: https://elevenlabs.io/mcp
Technical reference: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
