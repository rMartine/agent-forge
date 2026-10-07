import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
const destination = path.join(root,'packages/extension/out/graphify');
await mkdir(destination,{recursive:true});
for (const name of ['graphifyCommand.js','graphifyRuntime.js','graphifyIndex.js','graphifyFiles.js','graphifyProcess.js']) {
  await copyFile(path.join(root,'packages/core/dist',name),path.join(destination,name));
}
