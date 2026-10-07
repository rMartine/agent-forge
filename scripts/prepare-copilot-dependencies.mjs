import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'packages', 'copilot-dependencies');
const check = process.argv.includes('--check');
const descriptors = [
  ['elevenlabs-creative-studio', [], ['elevenlabs'], ['https://elevenlabs.io/mcp']],
  ['elevenlabs-text-to-speech', [], ['elevenlabs'], ['https://elevenlabs.io/mcp', 'https://elevenlabs.io/docs/api-reference/text-to-speech/convert']],
  ['elevenlabs-speech-to-text', [], ['elevenlabs'], ['https://elevenlabs.io/mcp', 'https://elevenlabs.io/docs/api-reference/speech-to-text/convert']],
  ['jupyter-notebook', ['nbformat', 'nbclient', 'ipykernel'], [], ['https://nbformat.readthedocs.io/en/latest/format_description.html', 'https://nbclient.readthedocs.io/en/latest/']],
  ['zotero', [], [], ['https://www.zotero.org/support/dev/web_api/v3/basics']],
  ['documents', ['python-docx'], [], ['https://python-docx.readthedocs.io/en/latest/']],
  ['presentations', ['python-pptx'], [], ['https://python-pptx.readthedocs.io/en/latest/']],
  ['spreadsheets', ['openpyxl'], [], ['https://openpyxl.readthedocs.io/en/stable/']],
  ['pdf', ['PyMuPDF'], [], ['https://pymupdf.readthedocs.io/en/latest/']],
  ['latex', [], [], ['https://www.latex-project.org/help/documentation/']],
];
const portable = value => value.split(path.sep).join('/');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) return [];
    const target = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink: ${target}`);
    if (entry.isDirectory()) return inventory(target);
    const content = fs.readFileSync(target);
    return [{ path: portable(path.relative(packageRoot, target)), sha256: sha256(content), bytes: content.length }];
  });
}
function storeOrCheck(destination, content) {
  if (check) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== content) throw new Error(`Generated inventory is stale: ${path.relative(root, destination)}`);
  } else fs.writeFileSync(destination, content);
}

const skills = descriptors.map(([name, pythonPackages, mcpProviders, references]) => {
  const id = `agent-forge-copilot-${name}`;
  const dir = path.join(packageRoot, 'skills', id);
  const skill = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  if (!skill.startsWith(`---\nname: ${id}\n`)) throw new Error(`Invalid frontmatter: ${id}`);
  const provenance = {
    kind: 'original-agent-forge-portable-implementation',
    authoredFor: 'Copilot four-roster migration',
    thirdPartySourceCopied: false,
    references,
    license: 'Repository-owner terms; third-party runtimes retain their upstream licenses',
  };
  storeOrCheck(path.join(dir, 'PROVENANCE.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  for (const file of inventory(dir)) {
    const bytes = fs.readFileSync(path.join(packageRoot, file.path));
    if (/CODEX_HOME|mcp__codex_apps|\.codex[\\/]plugins[\\/]cache/.test(bytes.toString('utf8'))) throw new Error(`Nonportable dependency in ${file.path}`);
  }
  return {
    id,
    source: portable(path.relative(root, dir)),
    provenance,
    dependencies: { pythonPackages, mcpProviders, python: name.startsWith('elevenlabs-') && name !== 'elevenlabs-speech-to-text' ? 'not-required' : '3.11+', optionalEngines: name === 'latex' ? ['latexmk', 'pdflatex', 'tectonic'] : ['documents', 'presentations', 'spreadsheets'].includes(name) ? ['Microsoft Office', 'LibreOffice'] : [] },
    files: inventory(dir),
  };
});
const manifest = {
  schemaVersion: 1,
  name: 'agent-forge-copilot-dependencies',
  runtimeDir: 'runtime',
  runtimeInstallSubdirectory: 'dependencies',
  runtimeToken: '__COPILOT_RUNTIME__',
  skillCount: skills.length,
  skills,
  runtime: inventory(path.join(packageRoot, 'runtime')),
  limitations: [
    'Python libraries and optional TeX/Office engines are discovered locally and are not bundled or automatically installed.',
    'MCP provider authentication and actual live schemas require VS Code connection; no authenticated status is implied.',
    'No functional generation, agent execution, notebook execution or model tests are part of preparation.',
    'Portable artifact workflows are original implementations; vendor-only cloud artifact editing APIs are not available.',
  ],
};
storeOrCheck(path.join(packageRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ mode: check ? 'static-check' : 'prepare', skills: skills.length, files: skills.reduce((sum, item) => sum + item.files.length, 0), manifest: 'packages/copilot-dependencies/manifest.json' }));
