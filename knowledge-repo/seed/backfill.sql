INSERT INTO entries (type, severity, title, description, root_cause, affected_domains, tags, prevention, created, updated) VALUES

(
  'lesson-learned',
  'critical',
  'Disabled Sub-Agent Nesting Broke Architecture Silently',
  'VS Code chat.subagents.allowInvocationsFromSubagents defaults to false. Agent Forge was designed around a multi-level org chart (CTO to Principal Engineer to Backend Developer), but this setting was never enabled. All work defaulted to @principal-engineer solo, specialists were never exercised, and quality degraded without any visible error.',
  'No validation that the required platform setting was enabled. The system degraded silently — the architecture appeared functional while operating in a fundamentally broken state.',
  ARRAY['infrastructure', 'backend'],
  ARRAY['sub-agents', 'vs-code', 'config', 'silent-degradation'],
  'Always validate critical platform prerequisites on activation. Silent degradation is worse than a loud error. Any capability the system depends on must be checked at startup and surfaced clearly if missing.',
  '2026-04-08T00:00:00Z',
  '2026-04-08T00:00:00Z'
),

(
  'lesson-learned',
  'high',
  'GitKraken MCP Server Covers Only 55% of Git Operations',
  'The git-workflow.instructions.md stated to prefer GitKraken MCP. GitKraken MCP lacks merge (the #1 most used operation in the workflow), branch delete, pull, fetch, tags, and stash pop. Agents following the instructions would silently fail on nearly half of all git operations.',
  'Tool capability assessment was never performed before the instruction was written. The preference assumed full coverage of git operations without verifying the actual scope.',
  ARRAY['infrastructure'],
  ARRAY['git', 'gitkraken', 'mcp', 'tool-coverage'],
  'Before codifying a tool preference in shared instructions, audit the actual capabilities and create a gap matrix. Never endorse a tool as the default for a category of operations without verifying coverage of all common operations.',
  '2026-04-08T00:00:00Z',
  '2026-04-08T00:00:00Z'
),

(
  'lesson-learned',
  'high',
  'Git Branch Created After Code Instead of Before',
  'Agents were observed writing code directly on development and creating the feature branch afterward. The git-workflow instructions listed create branch as step 1 but did not explicitly forbid coding without a branch.',
  'Instructions stated the sequence but did not enforce it as a hard rule. Agents optimize for speed and may skip setup steps when only the happy path is documented. Without an explicit prohibition, the wrong behavior is a valid interpretation.',
  ARRAY['infrastructure'],
  ARRAY['git', 'workflow', 'branching', 'process'],
  'For critical sequencing, state both the DO and the explicit DON''T. Instructions must include prohibitions, not just the happy path. Recovery paths should be documented for foreseeable violations.',
  '2026-04-08T00:00:00Z',
  '2026-04-08T00:00:00Z'
),

(
  'lesson-learned',
  'high',
  'Knowledge Repository Infrastructure Never Deployed',
  'The knowledge-engineer agent was designed around a Docker-based PostgreSQL repository (knowledge-repo/), but the Docker stack was never created or deployed. The KE silently fell back to writing flat markdown files in project_docs/knowledge/. No agent flagged that the central KB was missing.',
  'Infrastructure prerequisites were documented in the agent file but never bootstrapped. No startup check verified that the Docker stack was running.',
  ARRAY['infrastructure'],
  ARRAY['docker', 'postgresql', 'knowledge-base', 'silent-degradation'],
  'Infrastructure dependencies in agent files must have a corresponding bootstrap step. Add health checks or startup verification for required external services.',
  '2026-04-08T00:00:00Z',
  '2026-04-08T00:00:00Z'
),

(
  'lesson-learned',
  'medium',
  'Logo Generated as Hand-Crafted SVG Instead of Image Model Pipeline',
  'The logo icon was changed by having the principal engineer hand-write SVG markup directly. The graphic-designer agent was never invoked. The intended pipeline (creative-director selects model, graphic-designer downloads via Ollama, generates image locally) was completely bypassed.',
  'Sub-agents were not working (setting disabled), so the PE did everything solo. Additionally, the graphic-designer agent lacked explicit Ollama-first workflow, and the creative-director agent had no model selection step in the ideation process.',
  ARRAY['infrastructure'],
  ARRAY['ollama', 'image-generation', 'process', 'agent-bypass', 'logo'],
  'Creative assets must go through the proper pipeline (CD then GD with model). Never bypass specialist agents by having generalists produce creative output directly.',
  '2026-04-08T00:00:00Z',
  '2026-04-08T00:00:00Z'
);
