# Research session runtime procedure

Use this reference when registering and completing research assignments. The helper is `scripts/research-session.mjs` relative to the plugin root. Read its reported help or error if the installed interface differs; do not silently improvise a different protocol.

All commands take the real authorized project path and the current parent chat identifier. In PowerShell examples below:

- `$ResearchPluginRoot` is the absolute installed plugin root, obtained from the loaded skill location.
- `$ResearchProject` is the absolute authorized project path.
- `$env:CODEX_THREAD_ID` is the actual current parent chat identifier; do not invent it or use a specialist's identifier.
- Input variables contain absolute paths to UTF-8 JSON files prepared in an authorized temporary or project location. Pass these paths with `--input-file`; `--input` instead accepts literal JSON text. The two options are mutually exclusive.
- `$ResearchAssignmentId` is the identifier returned by `assign`.

The parent coordinator performs state mutations. A specialist returns evidence to the parent and does not write its own approval or session record. Do not copy secrets, full conversations or unnecessary participant data into any input.

The installed plugin obtains its shared session storage location from the absolute `sessionDataRoot` in `runtime.json`. Both principal commands and hook processes use that location, even when only the hook process receives `PLUGIN_DATA`. The location must be outside the authorized project. A source checkout without `runtime.json` uses a fixed research directory under the operating system's temporary directory; `PLUGIN_DATA` does not select a different session store. Explicit test configuration may override the location.

## Start a session

Construct an input object from the existing user instruction:

```json
{
  "objective": "The outcome authorized by Roberto for this session",
  "authorization": {
    "reference": "A reference to Roberto's actual instruction",
    "purpose": "The authorized research purpose",
    "sources": ["The actual authorized source or material references"],
    "actions": ["The actual authorized operations"],
    "limits": ["The actual applicable limits"]
  }
}
```

These strings illustrate the fields; replace them with actual instruction-derived values before using the input. Empty limits do not grant unlimited spending. A paid operation must have sufficient authorization covering the relevant action and any established limits. Conversely, do not invent a spending threshold or require repeated approval for steps already authorized.

```powershell
node "$ResearchPluginRoot/scripts/research-session.mjs" start --project $ResearchProject --session $env:CODEX_THREAD_ID --input-file $ResearchSessionInput
```

## Prepare and create a specialist

Read the catalog and selected role. Write the assignment input:

```json
{
  "roleId": "research-evidence-synthesis",
  "task": "The concrete authorized work, material references, permitted actions, expected output, and retained scientific decisions",
  "authorizationReference": "The reference to the existing user authorization"
}
```

An optional `taskName` can provide a readable task name. The helper produces the assignment identifier and correlation token; preserve them.

```powershell
node "$ResearchPluginRoot/scripts/research-session.mjs" assign --project $ResearchProject --session $env:CODEX_THREAD_ID --input-file $ResearchAssignmentInput
node "$ResearchPluginRoot/scripts/research-session.mjs" spawn-input --project $ResearchProject --session $env:CODEX_THREAD_ID --assignment $ResearchAssignmentId
```

Pass the returned JSON payload directly to the native `spawn_agent` tool. It includes `agent_type: "default"`, the catalog's `model` and `reasoning_effort`, `fork_turns: "none"`, the exact prepared task name, and the message containing the assignment token and absolute role and skill locations. Preserve both the task name and the token in the message; the task name is not itself the token.

Prepare and create one unbound assignment at a time so native start and post-tool events can correlate it unambiguously. After binding, multiple independent specialists may work concurrently within the available capacity. Read only the skills relevant to each assignment. Names in `externalSkills` refer to capabilities available in the current skill catalog and do not authorize installation.

The pre-tool hook checks creations it can observe. A post-tool event or start event can associate the actual subagent with the prepared assignment. Use `status` to examine recorded evidence; do not treat an agent's own model claim as independent confirmation of the actual model. If a hook rejects the creation, resolve the stated mismatch rather than changing the token, removing explicit model arguments or bypassing the helper.

## Record the result

The parent reviews the specialist's output and prepares:

```json
{
  "roleId": "research-evidence-synthesis",
  "status": "completed",
  "summary": "What was actually produced and established",
  "checks": [
    {
      "name": "The actual verification performed",
      "result": "passed",
      "details": "Evidence supporting this check",
      "command": "The command actually run, when relevant"
    }
  ],
  "artifacts": ["The actual artifact locations or source references"],
  "limitations": ["The actual unresolved limitations"]
}
```

`status` is `completed`, `blocked` or `interrupted`. Check results are `passed`, `failed`, `blocked` or `not-run`. Omit `command` when no command applies. If `checks` is empty, include `verificationNotRunReason` explaining why. Artifacts and limitations may be omitted when none exist. Include the specialist's role-specific completion evidence in the summary, checks or referenced artifacts; an existence check alone does not substantiate a scientific conclusion.

```powershell
node "$ResearchPluginRoot/scripts/research-session.mjs" evidence --project $ResearchProject --session $env:CODEX_THREAD_ID --assignment $ResearchAssignmentId --input-file $ResearchEvidenceInput
node "$ResearchPluginRoot/scripts/research-session.mjs" status --project $ResearchProject --session $env:CODEX_THREAD_ID
```

Missing evidence can justify the bounded completion step implemented by the stop hook. It does not justify restarting an interrupted assignment, hiding a failed check or launching new scientific work.

## Execute packaged scientific Python procedures

Read [the authorization policy procedure](../../../references/authorization-policy.md) before preparing or using a policy file. That file expresses the actual authorized locations, operations, destinations and limits; it does not authorize work by itself. Reuse authorization covering the activity instead of requesting permission for each routine step. Record only limits Roberto has established or that the authorized operation technically requires; do not invent a new budget requirement for every assignment.

Use the installed runtime associated with the plugin through its launcher, not the Windows `python.exe` alias or an arbitrary interpreter:

For a bound research specialist, submit one literal PowerShell command directly to `exec_command`. Resolve the plugin and authorization paths before building the command. The following example illustrates the accepted syntax; replace the example paths with the actual authorized locations and choose the script and arguments from the applicable skill:

```powershell
node 'C:\ResearchPlugin\scripts\run-research-python.mjs' --authorization 'D:\ResearchProject\authorization.json' --script 'skills/scientific-visualization/scripts/figure_export.py' -- '--help'
```

The executable may be `node`, `node.exe`, or the absolute path of the Node executable running the hook. Prefix an explicitly quoted executable path with the PowerShell call operator `&`. Use single quotes for literal arguments containing spaces or punctuation; escape a literal apostrophe by doubling it. Do not use variables, double-quoted interpolation, argument splatting, pipelines, multiline commands, or additional shell commands in this launcher invocation. The hook rejects an invocation mentioning this launcher when it cannot verify this restricted form.

Codex reports native unified terminal execution to hooks as `tool_name: "Bash"` with the literal command in `tool_input.command`. The plugin accepts that event shape and the `exec_command` / `functions.exec_command` compatibility forms with `tool_input.cmd`. This does not make commands nested inside `functions.exec` independently observable.

After a native specialist creation, check that `status` contains its linked identity before accepting scientific work. If the assignment remains `prepared` or `spawning`, stop that assignment and report the missing correspondence. Do not fabricate lifecycle events, manually insert an identity, or repeat the creation without resolving the cause. Tool dispatch logs and hook event payloads are different evidence: a name observed in dispatch does not by itself prove what a hook received.

The launcher path must be absolute and identify this installed plugin. The authorization file path must be absolute; its `authorizationReference` must exactly match the research session's recorded human authorization reference. The Python script must be a relative path inside this plugin and both the launcher and selected script must appear in its verified integrity inventory. Choose the script from the applicable skill, inspect its documented arguments, and keep its inputs and outputs within the assignment.

This hook check applies only when `PreToolUse` receives one of the direct terminal event forms described above. It does not parse JavaScript passed to `functions.exec`. If the client does not expose a nested shell call as its own hook event, this pre-tool check does not cover that nested command. Ordinary scientific shell commands and unrelated agents are not subjected to this launcher-specific check. Precise data paths, destinations, credentials, operation limits, and spending constraints remain checked inside `research_policy.py`; the hook is not a general shell security analyzer.

The launcher sets the required execution context. If validation fails, resolve the reported problem; do not remove controls or repeat an uncertain paid request automatically.

## Close the session

Prepare the direction's evidence using `roleId: "research-director"` and the same evidence shape. Summarize the integrated outcome, account for every assignment and state limitations. Record it without `--assignment`, then end the session:

```powershell
node "$ResearchPluginRoot/scripts/research-session.mjs" evidence --project $ResearchProject --session $env:CODEX_THREAD_ID --input-file $ResearchDirectorEvidenceInput
node "$ResearchPluginRoot/scripts/research-session.mjs" end --project $ResearchProject --session $env:CODEX_THREAD_ID
```

The command result and native event evidence determine what can be reported as verified. Distinguish manual helper checks from hooks observed in Desktop. The plugin's helpers and hooks do not cover every possible tool or establish an operating-system sandbox.
