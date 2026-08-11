import { runDeploymentTests } from './deployment.test';
import { runDiagnosticsTests } from './diagnostics.test';
import { runExtensionTests } from './extension.test';

export async function run(): Promise<void> {
  await runExtensionTests();
  await runDiagnosticsTests();
  await runDeploymentTests();
}
