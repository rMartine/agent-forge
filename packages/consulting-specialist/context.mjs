import { lstat, mkdir, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IDENTIFIER = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
export function clientIdentifier(value) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value) || RESERVED.test(value)) throw new Error('Cliente y proyecto requieren identificadores de letras minúsculas, números y guiones, de hasta 64 caracteres.');
  return value;
}

async function inspectDirectory(directory) {
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('El contexto requiere directorios regulares, sin enlaces ni puntos de redirección.');
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export async function clientDirectory(project, clientId, engagementId, initialize = false) {
  if (typeof project !== 'string' || !path.isAbsolute(project)) throw new Error('Se requiere la ruta absoluta del proyecto.');
  const root = await realpath(project);
  if (!(await lstat(root)).isDirectory()) throw new Error('El proyecto no es un directorio.');
  let directory = root;
  let exists = true;
  for (const segment of ['.consulting', clientIdentifier(clientId), clientIdentifier(engagementId)]) {
    directory = path.join(directory, segment);
    exists = await inspectDirectory(directory);
    if (!exists && initialize) {
      try { await mkdir(directory, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      exists = await inspectDirectory(directory);
    }
  }
  if (initialize) {
    const documents = {
      'context.md': `# Contexto del encargo\n\nCliente: ${clientId}\nProyecto del cliente: ${engagementId}\n\nConservar aquí el objetivo, audiencia, alcance y restricciones respaldados por el encargo. No guardar credenciales.\n`,
      'decisions.md': '# Decisiones del encargo\n\nRegistrar decisiones con fecha y fundamento. Distinguir propuestas de acuerdos y preservar decisiones anteriores cuando se sustituyan.\n',
      'sources.md': '# Fuentes del encargo\n\nRegistrar solamente materiales consultados: referencia, fecha, jurisdicción o periodo cuando importen y limitaciones. Los documentos del cliente permanecen en su ubicación autorizada.\n',
      'deliverables.md': '# Entregables del encargo\n\nEnlazar archivos producidos, su estado real y las comprobaciones realizadas. No afirmar que existen a partir de una intención o una llamada pendiente.\n'
    };
    for (const [name, content] of Object.entries(documents)) {
      const file = path.join(directory, name);
      try {
        const handle = await open(file, 'wx', 0o600);
        try { await handle.writeFile(content, 'utf8'); } finally { await handle.close(); }
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const metadata = await lstat(file);
        if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('Se conserva un contexto existente que no es un archivo regular.');
      }
    }
  }
  return { project: root, clientId, engagementId, directory, exists };
}

export async function runContextCommand(args) {
  const [command, ...rest] = args;
  if (!['init', 'locate'].includes(command)) throw new Error('Use init o locate --project RUTA --client IDENTIFICADOR --engagement IDENTIFICADOR.');
  const flags = {};
  for (let index = 0; index < rest.length; index += 2) {
    if (!['--project', '--client', '--engagement'].includes(rest[index]) || !rest[index + 1] || flags[rest[index]]) throw new Error('Argumentos de contexto inválidos.');
    flags[rest[index]] = rest[index + 1];
  }
  return clientDirectory(flags['--project'], flags['--client'], flags['--engagement'], command === 'init');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await runContextCommand(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
