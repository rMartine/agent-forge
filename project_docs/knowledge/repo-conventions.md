# Repository Conventions

- `agents/*.agent.md` is the sole canonical roster.
- Stable IDs are lowercase kebab-case and match manifest keys and evaluation fixture names.
- Skills use lowercase matching directories and frontmatter names; detailed material stays one level under `references/`.
- Automatically deployed instructions declare intentional `applyTo`.
- El asistente que desarrolla Agent Forge debe conservar una implementación coherente de las operaciones compartidas por la interfaz de comandos, la extensión y los scripts. Actualmente esas operaciones se implementan en el paquete packages/core. Las interfaces pueden asumir responsabilidades propias de sus entornos. Una reorganización que forme parte del encargo debe conservar los contratos compartidos que consumen las interfaces afectadas.
- Source agents are never rewritten during model/capability selection.
- Generated `dist/`, `out/`, coverage, extension test profiles, and deployment fixtures are ignored.
- Tests use temporary user profiles and never the real `~/.copilot` directory.
- Production/cloud/push/release/destructive actions require explicit authority.
- Cuando el encargo requiera instalar las dependencias del proyecto a partir de su archivo package-lock.json registrado, el asistente debe utilizar npm ci. La documentación identifica npm run build como comando de compilación y npm test como comando de pruebas. El asistente debe ejecutar esas actividades cuando correspondan al cambio o a condiciones vigentes de su fase; esta secuencia no es una preparación obligatoria para cada tarea ni una condición automática de cada commit.
