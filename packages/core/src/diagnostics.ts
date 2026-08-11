import type { Diagnostic, DiagnosticSeverity } from './types.js';

export const DIAGNOSTIC_MESSAGES: Record<string, string> = {
  AF001: 'Invalid custom-agent frontmatter',
  AF002: 'Duplicate agent identity',
  AF003: 'Broken subagent or handoff reference',
  AF004: 'Required tool or MCP capability unavailable',
  AF005: 'Invalid Agent Skill',
  AF006: 'Invalid custom instruction',
  AF007: 'Delegation cycle or unsupported nesting',
  AF008: 'Unsafe autonomous self-modification policy',
  AF009: 'Target collision with unmanaged customization',
  AF010: 'Unsupported VS Code version',
  AF011: 'Configured model is unavailable',
  AF012: 'Deployment state or backup integrity failure',
};

export function diagnostic(
  code: `AF${string}`,
  severity: DiagnosticSeverity,
  message: string,
  context: Partial<Pick<Diagnostic, 'path' | 'agentId' | 'hint'>> = {},
): Diagnostic {
  return { code, severity, message, ...context };
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(item => item.severity === 'error');
}
