const path = require('node:path');
const { runInstalledGraphifyCommand } = require('./graphify/graphifyCommand.js');

const cancellation = new AbortController();
const interrupt = () => cancellation.abort();
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

runInstalledGraphifyCommand(process.argv.slice(2), path.join(__dirname, 'graphify-runtime.json'), cancellation.signal)
  .then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
  .catch(error => {
    process.stderr.write(`Agent Forge Graphify: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  });
