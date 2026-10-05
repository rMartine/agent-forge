// Protocol availability only. No credentials, user content, tools/call or OAuth tokens.
import { writeFile } from 'node:fs/promises';
const endpoints={elevenlabs:'https://api.elevenlabs.io/v1/mcp',shotstack:'https://mcp.shotstack.io/'};
const connections={};
for(const [provider,url] of Object.entries(endpoints)){
 try {
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'agent-forge-installation-metadata',version:'0.3.0'}}}),signal:AbortSignal.timeout(15000),redirect:'error'});
  connections[provider]={endpoint:url,httpStatus:response.status,authentication:response.status===401||response.status===403?'VS Code OAuth required':'not-established-by-this-unauthenticated-probe',negotiation:response.ok?'endpoint-accepted-initialize; authenticated-client-catalog-still-required':'initialize-not-completed',toolCalls:0};
  await response.body?.cancel();
 }catch{connections[provider]={endpoint:url,status:'unavailable-to-unauthenticated-probe',authentication:'pending-in-VS-Code',toolCalls:0};}
}
await writeFile('project_docs/copilot-mcp-endpoint-review.json',JSON.stringify({checkedAt:new Date().toISOString(),connections,scope:'Unauthenticated initialize only; no tokens copied and no tools invoked'},null,2)+'\n');
console.log(JSON.stringify(connections,null,2));
