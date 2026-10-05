import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { cases, candidates } from '../evals/codex/models/cases.mjs';
import { renderCodexAgent } from '../packages/core/dist/index.js';
import { parse as parseToml } from 'smol-toml';
import { parse as parseJsonc } from 'jsonc-parser';

const { values } = parseArgs({ options: {
  run: { type: 'boolean', default: false },
  root: { type: 'string' }, agent: { type: 'string' }, model: { type: 'string' },
  concurrency: { type: 'string', default: '2' }, codex: { type: 'string', default: 'codex' },
} });
const repository = path.resolve(import.meta.dirname, '..');
const root = path.resolve(values.root ?? path.join(repository, '.cache', 'model-comparison', new Date().toISOString().replaceAll(':','-')));
const allowedRoot = path.join(repository, '.cache', 'model-comparison');
if (!root.startsWith(`${allowedRoot}${path.sep}`)) throw new Error('Evaluation root must be a new child of the ignored model-comparison directory.');
const concurrency = Number(values.concurrency);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error('Use one or two concurrent evaluation processes.');
const digest = content => createHash('sha256').update(content).digest('hex');
const manifest = parseJsonc(await readFile(path.join(repository,'agent-forge.manifest.jsonc'),'utf8'));
await mkdir(root, { recursive: true });
const definitions = await readFile(path.join(repository, 'evals/codex/models/cases.mjs'));
const definitionsHash = digest(definitions);
const selected = cases.filter(item => !values.agent || item.agent === values.agent);
if (!selected.length) throw new Error('No matching agent case.');

async function command(executable, args, options) {
  const started = Date.now();
  return new Promise(resolve => {
    const child = spawn(executable, args, { cwd: options.cwd, windowsHide: true, shell: false, env: options.env ?? process.env, stdio: ['pipe','pipe','pipe'] });
    let stdout = ''; let stderr = ''; let timedOut = false;
    const outputLog = options.logDirectory ? createWriteStream(path.join(options.logDirectory,'events.jsonl')) : undefined;
    const errorLog = options.logDirectory ? createWriteStream(path.join(options.logDirectory,'stderr.txt')) : undefined;
    child.stdout.on('data', data => { stdout += data; outputLog?.write(data); });
    child.stderr.on('data', data => { stderr += data; errorLog?.write(data); });
    child.on('error', error => resolve({ code: null, stdout, stderr: `${stderr}\n${error.message}`, durationMs: Date.now()-started, timedOut }));
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.timeout ?? 600000);
    child.on('close', code => { clearTimeout(timer); outputLog?.end(); errorLog?.end(); resolve({ code, stdout, stderr, durationMs: Date.now()-started, timedOut }); });
    child.stdin.end(options.input ?? '');
  });
}

const tasks = [];
for (const item of selected) {
  const definition = manifest.codex.agents[item.agent];
  if (!definition) throw new Error(`Missing role ${item.agent}`);
  const agentSource = await readFile(path.join(repository, manifest.agents[definition.sourceAgent].source), 'utf8');
  for (const [model, effort] of candidates(item.agent)) {
    if (values.model && values.model !== model) continue;
    const role = parseToml(renderCodexAgent(agentSource, { ...definition, model, modelReasoningEffort: effort }, manifest, [])).developer_instructions;
    const directory = path.join(root, `${item.agent}--${model}`);
    await mkdir(directory, { recursive: true });
    const prompt = [
      'This is a controlled, synthetic software-product assignment for evaluating one Agent Forge specialist.',
      'Work only in the supplied directory. Do not read personal profiles, real product repositories, credentials, or network resources. Do not delegate, install dependencies, commit, deploy, or contact services.',
      'The task below is the complete authorized scope. Existing role instructions still apply. For review-only roles return your assessment in the final response; the evaluator saves that response. No file writes are required for reviews.',
      `Permitted implementation files: ${item.ownership.join(', ')}. Preserve every supplied file outside that list.`,
      'All supplied data are synthetic. Use the installed Node.js or .NET runtime when relevant. Report only checks actually executed; a tool failure is not permission to claim success.',
      item.requirement,
      item.kind === 'review' ? 'Return the assessment as your final response, even if you also save it in assessment.md.' : 'Implement the requested change, then return concise actual verification and limitations.',
    ].join('\n\n');
    const frozen = { version: 1, agent: item.agent, model, effort, definitionsHash, roleHash: digest(role), promptHash: digest(prompt), files: Object.fromEntries(Object.entries(item.files).map(([name, content]) => [name,digest(content)])), criteria: item.criteria ?? [], preparedAt: new Date().toISOString() };
    let existing;
    try { existing = JSON.parse(await readFile(path.join(directory,'result.json'),'utf8')); } catch {}
    if (existing) { console.log(`Already observed: ${item.agent} ${model} (${existing.command.code})`); continue; }
    // Never overwrite a previous partial evaluation; use another run directory instead.
    const prior = await readdir(directory);
    if (prior.length) throw new Error(`Evaluation directory already contains an unfinished run: ${directory}`);
    for (const [name, content] of Object.entries(item.files)) await writeFile(path.join(directory,name), content);
    await writeFile(path.join(directory,'PROTECTED.txt'), 'Synthetic retained user material. Must remain unchanged.\n');
    await writeFile(path.join(directory,'prepared.json'), JSON.stringify(frozen,null,2));
    await writeFile(path.join(directory,'prompt.txt'), prompt);
    await writeFile(path.join(directory,'role.txt'), role);
    tasks.push({ item, model, effort, directory, role, prompt, frozen });
  }
}
if (!values.run) {
  console.log(JSON.stringify({ root, definitionsHash, preparedAssignments: tasks.length, executed: false }));
  process.exit(0);
}

async function evaluate(task) {
  const { item, model, effort, directory, role, prompt, frozen } = task;
  console.log(`Starting ${item.agent} ${model} ${effort}`);
  const output = path.join(directory, item.kind === 'review' ? 'assessment.md' : 'response.md');
  const execution = await command(values.codex, ['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','workspace-write','--json','--color','never','--model',model,'-c',`model_reasoning_effort=${JSON.stringify(effort)}`,'-c',`developer_instructions=${JSON.stringify(role)}`,'-c','features.multi_agent=false','--cd',directory,'--output-last-message',output,'-'], { cwd:directory,input:prompt,logDirectory:directory });
  await writeFile(path.join(directory,'events.jsonl'), execution.stdout);
  await writeFile(path.join(directory,'stderr.txt'), execution.stderr);
  const events = execution.stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const usage = events.filter(event => event.type === 'turn.completed').map(event => event.usage);
  const checks = [];
  for (const [name, expectedHash] of Object.entries(frozen.files)) {
    if (item.ownership.includes(name)) continue;
    let actual; try { actual=digest(await readFile(path.join(directory,name))); } catch {}
    checks.push({ name:`Preserve ${name}`, passed:actual === expectedHash });
  }
  checks.push({name:'Preserve retained user material',passed:await readFile(path.join(directory,'PROTECTED.txt'),'utf8').catch(()=>null)==='Synthetic retained user material. Must remain unchanged.\n'});
  let verification;
  if (execution.code === 0 && item.verification) {
    await writeFile(path.join(directory,'independent-checks.mjs'), item.verification);
    verification=await command(process.execPath,['independent-checks.mjs'],{cwd:directory,timeout:30000});
    checks.push({name:'Independent implementation acceptance',passed:verification.code===0});
  } else if (execution.code === 0 && item.kind === 'dotnet') {
    verification=await command('dotnet',['run','--project','Evaluation.csproj','--no-restore'],{cwd:directory,timeout:90000});
    if (verification.code !== 0 && /assets file|NETSDK1004/i.test(verification.stdout+verification.stderr)) verification=await command('dotnet',['run','--project','Evaluation.csproj'],{cwd:directory,timeout:90000});
    checks.push({name:'Independent decimal allocation acceptance',passed:verification.code===0});
  } else if (execution.code === 0 && item.kind === 'qa') {
    verification=[];
    for (const implementation of item.implementations) {
      const testDirectory=path.join(directory,`verification-${implementation.name}`);
      await mkdir(testDirectory);
      await writeFile(path.join(testDirectory,'solution.mjs'),implementation.source);
      await writeFile(path.join(testDirectory,'acceptance.test.mjs'),await readFile(path.join(directory,'acceptance.test.mjs')));
      const observed=await command(process.execPath,['--test','acceptance.test.mjs'],{cwd:testDirectory,timeout:30000});
      verification.push({name:implementation.name,...observed});
      checks.push({name:`QA distinguishes ${implementation.name}`,passed:(observed.code===0)===implementation.shouldPass});
    }
  }
  const result={...frozen, finishedAt:new Date().toISOString(), command:{executable:values.codex,code:execution.code,durationMs:execution.durationMs,timedOut:execution.timedOut}, usage, checks, verification, reviewRequired:item.kind==='review', modelObservation:'Requested explicitly through Codex CLI; this is not native Desktop/VS Code subagent-discovery evidence.'};
  await writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2));
  console.log(`Finished ${item.agent} ${model}: exit=${execution.code}, automaticChecks=${checks.every(check=>check.passed)}, reviewRequired=${result.reviewRequired}`);
}
let cursor=0;
await Promise.all(Array.from({length:Math.min(concurrency,tasks.length)},async()=>{ while(cursor<tasks.length){ const task=tasks[cursor++]; try { await evaluate(task); } catch(error){await writeFile(path.join(task.directory,'evaluation-error.txt'),String(error.stack??error));console.log(`Evaluation error ${task.item.agent} ${task.model}: ${error.message}`);} } }));
console.log(JSON.stringify({root,definitionsHash,attemptedAssignments:tasks.length}));
