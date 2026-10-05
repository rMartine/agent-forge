// Static high-confidence secret-pattern scan; never prints a matching value.
import { execFileSync } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',windowsHide:true}).split('\0').filter(Boolean);
const findings=[];let checked=0;
for(const file of files){let bytes;try{bytes=await readFile(file);}catch{continue;}if(bytes.includes(0)||bytes.length>4*1024*1024)continue;checked++;const content=bytes.toString('utf8');if(/(?<![A-Za-z0-9])(?:sk-(?:proj-)?|gh[pousr]_)[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?<![A-Za-z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}/.test(content))findings.push({path:file,kind:'review-required; value suppressed'});}
const report={checkedAt:new Date().toISOString(),scope:'Versioned and non-ignored source/report text files',checkedFiles:checked,findings,method:'high-confidence credential token and private-key patterns; values never printed'};
await writeFile('project_docs/copilot-secret-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checked,findings}));if(findings.length)process.exitCode=1;
