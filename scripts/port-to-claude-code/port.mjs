#!/usr/bin/env node
/**
 * port.mjs — Convert Copilot custom-agent files (agents/*.agent.md)
 * into Claude Code subagent files (.claude/agents/<division>/*.md).
 * Skips orchestrators unless --all is passed.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const SRC_DIR = join(REPO_ROOT, 'agents');
const DEST_DIR = join(REPO_ROOT, '.claude', 'agents');
const MANIFEST_PATH = join(REPO_ROOT, 'agent-forge.manifest.jsonc');

const ORCHESTRATORS = new Set(['cto', 'principal-engineer', 'creative-director']);

// Model per agent. Orchestrators stay 'inherit'. Mechanical work goes to haiku.
const MODELS_MAP = {
  'technical-writer': 'haiku',
  'knowledge-engineer': 'haiku',
  'project-manager': 'haiku',
  'requirements-engineer': 'haiku',
  'graphic-designer': 'haiku',
};

// Skills to preload per agent. Missing/disabled skills are silently skipped.
const SKILLS_MAP = {
  'technical-writer': ['docx', 'pdf'],
  'data-scientist': ['xlsx'],
  'knowledge-engineer': ['productivity:memory-management'],
  'project-manager': ['operations:status-report', 'productivity:task-management'],
  'requirements-engineer': ['operations:process-doc', 'sales:call-summary'],
  'creative-director': ['marketing:brand-review', 'marketing:content-creation'],
  'software-architect': ['operations:runbook'],
  'devops-engineer': ['operations:runbook', 'operations:change-request'],
  'graphic-designer': ['pptx', 'frontend-design'],
  'ux-engineer': ['frontend-design'],
};

// MCP tool globs to APPEND to an agent's base toolset. Each entry adds to tools:.
// Requires that the MCP server is configured in ~/.claude.json or <project>/.mcp.json.
const MCP_MAP = {
  'graphic-designer': ['mcp__canva__*'],
  'ux-engineer': ['mcp__canva__*'],
};

const TOOLSET_MAP = {
  'all-builtins': 'Read, Edit, Write, Grep, Glob, Bash, WebSearch, WebFetch, TodoWrite',
  'devops':
    'Read, Edit, Write, Grep, Glob, Bash, WebSearch, WebFetch, TodoWrite, mcp__digitalocean__*, mcp__docker__*, mcp__github__*',
  'knowledge':
    'Read, Edit, Write, Grep, Glob, Bash, WebSearch, WebFetch, TodoWrite, mcp__docker__*',
  'orchestrator':
    'Read, Edit, Write, Grep, Glob, Bash, WebSearch, WebFetch, TodoWrite, Agent',
};

const DEFAULT_MODEL = 'sonnet';

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run');
const includeOrchestrators = argv.has('--all') || argv.has('--include-orchestrators');

function loadCategories() {
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  const cleaned = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/,(\s*[}\]])/g, '$1');
  const json = JSON.parse(cleaned);
  const map = new Map();
  for (const entry of json.agents) map.set(entry.id, entry.category);
  return map;
}

function parseAgent(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing YAML frontmatter');
  const fm = parseYaml(match[1]);
  const body = match[2].trimStart();
  return { fm, body };
}

function handoffsToSection(handoffs) {
  if (!handoffs || !Array.isArray(handoffs) || handoffs.length === 0) return '';
  const lines = ['', '## Next steps', ''];
  lines.push('When your task is complete, return a summary to the parent that suggests the next agent to route to:', '');
  for (const h of handoffs) {
    lines.push(`- **Hand off to \`${h.agent}\`** — ${h.prompt || h.label || ''}`);
  }
  return lines.join('\n') + '\n';
}

function convertFrontmatter(id, fm, isOrchestrator) {
  const out = {};
  out.name = id;
  out.description = fm.description || `Specialist agent: ${id}`;
  const toolsetName = Array.isArray(fm.tools) ? fm.tools[0] : fm.tools;
  let toolsStr = TOOLSET_MAP[toolsetName] || TOOLSET_MAP['all-builtins'];
  if (isOrchestrator && Array.isArray(fm.agents) && fm.agents.length > 0) {
    const allowlist = `Agent(${fm.agents.join(', ')})`;
    toolsStr = toolsStr.replace(/\bAgent\b(?!\()/, allowlist);
  }
  const mcpAdds = MCP_MAP[id];
  if (mcpAdds && mcpAdds.length > 0) {
    toolsStr = toolsStr + ', ' + mcpAdds.join(', ');
  }
  out.tools = toolsStr;
  if (isOrchestrator || id === 'software-architect') {
    out.model = 'inherit';
  } else {
    out.model = MODELS_MAP[id] || DEFAULT_MODEL;
  }
  const skills = SKILLS_MAP[id];
  if (skills && skills.length > 0) out.skills = skills;
  return out;
}

function serializeFrontmatter(fm) {
  const lines = ['---'];
  lines.push(`name: ${fm.name}`);
  const desc = String(fm.description).replace(/"/g, '\\"');
  lines.push(`description: "${desc}"`);
  lines.push(`tools: ${fm.tools}`);
  lines.push(`model: ${fm.model}`);
  if (fm.skills && fm.skills.length > 0) {
    lines.push('skills:');
    for (const s of fm.skills) lines.push(`  - ${s}`);
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

function portOne(id, category, srcFile) {
  const text = readFileSync(srcFile, 'utf8');
  const { fm, body } = parseAgent(text);
  const isOrchestrator = ORCHESTRATORS.has(id);
  if (isOrchestrator && !includeOrchestrators) {
    return { id, status: 'skipped-orchestrator' };
  }
  const newFm = convertFrontmatter(id, fm, isOrchestrator);
  const handoffSection = handoffsToSection(fm.handoffs);
  let newBody = body
    .replace(/`@([a-z0-9-]+)`/g, '`$1`')
    .replace(/@([a-z0-9-]+)/g, '`$1`');
  const out = serializeFrontmatter(newFm) + '\n' + newBody.trimEnd() + '\n' + handoffSection;
  const destFolder = join(DEST_DIR, category);
  const destFile = join(destFolder, `${id}.md`);
  if (!dryRun) {
    mkdirSync(destFolder, { recursive: true });
    writeFileSync(destFile, out, 'utf8');
  }
  return { id, status: dryRun ? 'dry-run' : 'written', path: destFile, model: newFm.model };
}

function main() {
  const categories = loadCategories();
  const sources = readdirSync(SRC_DIR).filter((f) => f.endsWith('.agent.md'));
  const results = [];
  for (const file of sources) {
    const id = basename(file, '.agent.md');
    const cat = categories.get(id);
    if (!cat) { results.push({ id, status: 'no-manifest-entry' }); continue; }
    try { results.push(portOne(id, cat, join(SRC_DIR, file))); }
    catch (err) { results.push({ id, status: 'error', error: String(err.message) }); }
  }
  console.log('\nPort results:');
  for (const r of results) {
    const tag = r.status.padEnd(22);
    const model = r.model ? ` [${r.model}]` : '';
    console.log(`  ${tag} ${r.id}${model}`);
  }
  const written = results.filter((r) => r.status === 'written').length;
  const skipped = results.filter((r) => r.status === 'skipped-orchestrator').length;
  const errors = results.filter((r) => r.status === 'error' || r.status === 'no-manifest-entry').length;
  console.log(`\nTotal: ${results.length}  |  Written: ${written}  |  Skipped orchestrators: ${skipped}  |  Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main();
