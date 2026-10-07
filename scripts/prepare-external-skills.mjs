import { fileURLToPath } from 'node:url';
import { loadManifest, loadExternalSkillCatalog, loadRosterCatalog, resolveExternalSkillFiles } from '../packages/core/dist/index.js';

const repository = fileURLToPath(new URL('../', import.meta.url));
const manifest = await loadManifest(repository);
if (manifest.schemaVersion >= 6) {
  const roster = await loadRosterCatalog(repository, { downloadSkills: true });
  process.stdout.write(`${roster.agents.length} agents and ${roster.resources.length} canonical resources prepared; pinned skills verified.\n`);
  process.exit(0);
}
const catalog = await loadExternalSkillCatalog(repository, manifest);
for (const skill of catalog.skills) {
  const files = await resolveExternalSkillFiles(repository, skill, true);
  process.stdout.write(`${skill.id}: ${files.length - 1} pinned resources verified; adaptations resolved.\n`);
}
