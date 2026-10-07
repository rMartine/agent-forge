import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = os.homedir();
const here = path.dirname(fileURLToPath(import.meta.url));
let researchPython;
const researchConfig = path.resolve(here, '..', 'research-specialists', 'runtime.json');
if (existsSync(researchConfig)) {
  try { researchPython = JSON.parse(readFileSync(researchConfig, 'utf8').replace(/^\uFEFF/, '')).pythonExecutable; }
  catch { /* Invalid configuration remains unavailable; do not alter it. */ }
}
const uvRoot = process.env.UV_PYTHON_INSTALL_DIR || (process.platform === 'win32'
  ? path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'uv', 'python')
  : path.join(home, '.local', 'share', 'uv', 'python'));
const uvPython = existsSync(uvRoot) ? readdirSync(uvRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('cpython-'))
  .sort((a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }))
  .map(entry => path.join(uvRoot, entry.name, ...(process.platform === 'win32' ? ['python.exe'] : ['bin', 'python3']))) : [];
function executableOnPath(name) {
  const extensions = process.platform === 'win32' ? ['.exe', ''] : [''];
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    if (process.platform === 'win32' && /[\\/]Microsoft[\\/]WindowsApps(?:[\\/]|$)/i.test(directory)) continue;
    for (const extension of extensions) {
      const candidate = path.join(directory, name + extension);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}
const candidates = [...new Set([
  process.env.AGENT_FORGE_PYTHON,
  path.join(here, '.venv', ...(process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'])),
  researchPython,
  path.join(home, '.agent-forge', 'research', 'venv', 'Scripts', 'python.exe'),
  path.join(home, '.agent-forge', 'research', '.venv', 'Scripts', 'python.exe'),
  path.join(home, '.agent-forge', 'research', 'venv', 'bin', 'python'),
  ...uvPython,
  ...['python', 'python3', 'py'].map(executableOnPath),
].filter(Boolean))];
const probe = "import sys,json,importlib.metadata as m; names=['python-docx','python-pptx','openpyxl','PyMuPDF','nbformat','nbclient','ipykernel']; installed={d.metadata['Name'].lower():d.version for d in m.distributions() if d.metadata['Name']}; print(json.dumps({'executable':sys.executable,'version':sys.version.split()[0],'packages':{n:installed.get(n.lower()) for n in names}}))";
const python = candidates.map(command => {
  if (path.isAbsolute(command) && !existsSync(command)) return { command, available: false };
  const r = spawnSync(command, ['-c', probe], { encoding: 'utf8', timeout: 15000, windowsHide: true });
  if (r.status !== 0) return { command, available: false };
  try { return { command, available: true, ...JSON.parse(r.stdout.trim()) }; }
  catch { return { command, available: false }; }
});
const executables = [process.env.AGENT_FORGE_NODE || process.execPath, 'uv', 'tectonic', 'latexmk', 'pdflatex', 'soffice'];
const engines = executables.map(command => {
  const r = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  return { command, available: r.status === 0, version: r.status === 0 ? r.stdout.trim().split(/\r?\n/)[0] : null };
});
console.log(JSON.stringify({ schemaVersion: 1, python, engines, selectedPython: python.find(p => p.available)?.executable ?? null }, null, 2));
