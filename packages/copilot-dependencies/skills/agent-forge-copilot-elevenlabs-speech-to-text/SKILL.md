---
name: agent-forge-copilot-elevenlabs-speech-to-text
description: Transcribe authorized audio or video through ElevenLabs MCP and deliver traceable transcripts, speaker labels and subtitle files.
---

# Speech to text

Use authenticated MCP at `https://api.elevenlabs.io/v1/mcp`; discover current tools
for transcription, supported models, upload/reference formats, status and results.

1. Verify access to the requested file or URL. Determine spoken language, verbatim
   versus cleaned transcript, speaker labeling, timestamps and desired format.
   Do not upload unrelated recordings. Record the original filename and duration
   when available; preserve its bytes and use the server-supported asset mechanism.
2. Inspect the actual transcription schema. Select a returned compatible model;
   use language hints, diarization or event tagging only if supported and requested.
   Do not promise speaker identity: diarization labels are anonymous until the user
   supplies a mapping or the audio explicitly identifies a speaker.
3. Submit once, retain the job identifier and poll its status where required.
   Handle rejected MIME types, size limits, unavailable URLs and authentication
   errors explicitly. For a split recording record segment offsets, overlap and
   reassembly order so timestamps remain relative to the original recording.
4. Preserve the raw result separately from an edited transcript. Review uncertain
   names, technical terms, code-switching, numbers and inaudible spans. Use markers
   such as `[inaudible 00:01:23]` rather than fabricating missing speech.
5. For subtitles normalize returned segments to an array of objects with `start`,
   `end` (seconds) and `text`. Run `python scripts/subtitles.py segments.json out.srt`.
   The helper validates ordering and positive duration; adjust readable cue length
   and line breaks without changing the underlying meaning.
6. Deliver raw and cleaned transcript if requested, subtitle file and limitations
   such as overlapping speech. Distinguish actual timestamps from estimated ones.

Connection: https://elevenlabs.io/mcp
Technical reference: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
