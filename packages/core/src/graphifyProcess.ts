import { spawn } from 'node:child_process';
import * as path from 'node:path';

export function graphifyEnvironment(privateDirectory: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'SystemDrive', 'SYSTEMDRIVE', 'NUMBER_OF_PROCESSORS']) if (process.env[name]) env[name] = process.env[name];
  // These are private child-process settings; the host environment is never changed.
  Object.assign(env, {
    HOME: privateDirectory, USERPROFILE: privateDirectory,
    APPDATA: path.join(privateDirectory, 'appdata'), LOCALAPPDATA: path.join(privateDirectory, 'localappdata'),
    TEMP: path.join(privateDirectory, 'tmp'), TMP: path.join(privateDirectory, 'tmp'),
    GRAPHIFY_NO_AUTO_REFRESH: '1', GRAPHIFY_GOOGLE_WORKSPACE: '0', GRAPHIFY_QUERY_LOG_DISABLE: '1',
    GRAPHIFY_OUT: 'graphify-out', GRAPHIFY_MAX_WORKERS: '1', GRAPHIFY_NO_TIPS: '1',
    PIP_CONFIG_FILE: process.platform === 'win32' ? 'nul' : '/dev/null', PIP_NO_INDEX: '1',
    PIP_DISABLE_PIP_VERSION_CHECK: '1', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1',
  });
  return env;
}

export async function runGraphifyProcess(executable: string, args: string[], options: {
  cwd: string; env: NodeJS.ProcessEnv; timeoutMs?: number; signal?: AbortSignal; maxOutputBytes?: number;
}): Promise<{ stdout: string; stderr: string }> {
  if (options.signal?.aborted) throw new Error('Graphify operation cancelled');
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: options.cwd, env: options.env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let failure: Error | undefined; let total = 0;
    const stop = (message: string) => { failure ??= new Error(message); child.kill(); };
    const cancel = () => stop('Graphify operation cancelled');
    options.signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => stop('Graphify operation exceeded its time limit'), options.timeoutMs ?? 120_000);
    const capture = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
      total += chunk.length;
      if (total > (options.maxOutputBytes ?? 2 * 1024 * 1024)) { stop('Graphify output exceeded its limit'); return; }
      if (stream === 'stdout') stdout += chunk.toString('utf8'); else stderr += chunk.toString('utf8');
    };
    child.stdout.on('data', chunk => capture(chunk, 'stdout'));
    child.stderr.on('data', chunk => capture(chunk, 'stderr'));
    child.on('error', error => { failure ??= error; });
    child.on('close', code => {
      clearTimeout(timer); options.signal?.removeEventListener('abort', cancel);
      if (failure) reject(failure);
      // Upstream error output can contain source excerpts. Do not copy it into status/errors.
      else if (code !== 0) reject(new Error(`Graphify process failed with exit code ${code}; no index was published`));
      else resolve({ stdout, stderr });
    });
  });
}
