import type { CopilotHarness, DeploymentArtifact, DeploymentManifestV3, Diagnostic } from './types.js';
import { loadRosterCatalog } from './rosterCatalog.js';
import { renderRosterEdition, editionFileTarget } from './rosterAdapters.js';
import { resolveTargetPath } from './paths.js';
import { hashBuffer } from './hash.js';

/** Compatibility entry point. Content always comes from the shared canonical catalog. */
export async function renderCopilotRosters(repoPath:string,manifest:DeploymentManifestV3,options:{harness?:CopilotHarness;downloadSkills?:boolean;availableModels?:string[];availableTools?:string[]}={}):Promise<{artifacts:DeploymentArtifact[];diagnostics:Diagnostic[]}>{
  const config=manifest.copilotFourRosters??(manifest.rosterRuntimeRoots?{runtimeRoot:manifest.rosterRuntimeRoots.vscode}:undefined);
  if(!config)throw new Error('Four-roster configuration is missing');
  const context={repoPath,agentRoot:resolveTargetPath(manifest.targets.vscode.agents),skillRoot:resolveTargetPath(manifest.targets.vscode.skills),runtimeRoot:resolveTargetPath(config.runtimeRoot),hooksRoot:resolveTargetPath(manifest.targets.vscode.hooks),...options};
  const catalog=await loadRosterCatalog(repoPath,{downloadSkills:options.downloadSkills});
  const result=await renderRosterEdition(catalog,'vscode',context);
  return {artifacts:result.files.map(file=>({id:file.id,type:file.type,runtime:'vscode',sourcePath:file.sourcePath,targetPath:editionFileTarget(file,context),content:file.content,sourceHash:hashBuffer(file.content)})),diagnostics:result.diagnostics};
}
