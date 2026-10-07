import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyReadOnlyTool as codex } from '../../../hooks/codex/hook-storage.mjs';
import { classifyReadOnlyTool as independent } from '../../independent-specialists/hook-storage.mjs';
import { classifyReadOnlyTool as consulting } from '../../consulting-specialist/hook-storage.mjs';
import { classifyReadOnlyTool as research } from '../../research-specialists/scripts/hook-storage.mjs';

const classifiers = [codex, independent, consulting, research];

test('read-only classification admits known inspection tools and nested delegation', () => {
  const readable = [
    'Read', 'read_file', 'list_files', 'functions.read_mcp_resource',
    'mcp__google_drive__search', 'mcp__codex_apps__google_drive__get_file',
    'WebSearch', 'web.run', 'Grep', 'Glob',
  ];
  const delegations = [
    'Agent', 'spawn_agent', 'collaboration.spawn_agent', 'functions.collaboration.spawn_agent',
  ];
  const collaborationControls = ['collaboration.wait_agent', 'collaboration.list_agents', 'collaboration.send_message', 'collaboration.followup_task', 'collaboration.interrupt_agent'];

  for (const classify of classifiers) {
    for (const tool of readable) assert.equal(classify(tool), 'read', `${tool} should remain available for inspection`);
    for (const tool of delegations) assert.equal(classify(tool), 'delegate', `${tool} should allow delegation`);
    for (const tool of collaborationControls) assert.notEqual(classify(tool), 'deny', `${tool} should remain available to integrate child work`);
  }
});

test('read-only classification denies mutators, execution and unknown tools even when names include read verbs', () => {
  const denied = [
    'mcp__codex_apps__canva_generate_image',
    'mcp__codex_apps__canva_perform_editing_operations',
    'get_or_create_record',
    'read_then_delete_file',
    'functions.exec', 'functions.exec_command', 'Bash', 'write_stdin',
    'custom_tool', 'unknown_action', '', undefined,
  ];

  for (const classify of classifiers) {
    for (const tool of denied) assert.equal(classify(tool), 'deny', `${String(tool)} must not pass the read-only guard`);
  }
});

test('the Codex, independent, consulting and research bundles share the same classification contract', () => {
  const tools = [
    'Agent', 'Read', 'read_file', 'mcp__codex_apps__google_drive__search',
    'mcp__codex_apps__canva_generate_image', 'mcp__codex_apps__canva_perform_editing_operations',
    'get_or_create_record', 'functions.exec', 'custom_tool',
  ];
  for (const tool of tools) {
    const outcomes = classifiers.map(classify => classify(tool));
    assert.deepEqual(outcomes, [outcomes[0], outcomes[0], outcomes[0], outcomes[0]], tool);
  }
});
