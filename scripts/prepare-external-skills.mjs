import { fileURLToPath } from 'node:url';
import { loadManifest, loadExternalSkillCatalog, resolveExternalSkillFiles } from '../packages/core/dist/index.js';

const repository = fileURLToPath(new URL('../', import.meta.url));
const manifest = await loadManifest(repository);
const catalog = await loadExternalSkillCatalog(repository, manifest);
for (const skill of catalog.skills) {
  const files = await resolveExternalSkillFiles(repository, skill, true);
  process.stdout.write(`${skill.id}: ${files.length - 1} pinned resources verified; adaptations resolved.\n`);
}
