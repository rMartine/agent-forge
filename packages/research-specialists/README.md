# Especialistas de investigación

Este paquete conserva los veinte roles de investigación, sus habilidades, recursos científicos, referencias de procedencia, políticas, hooks y programas auxiliares. El instalador los distribuye como agentes y habilidades globales de Codex. La conversación principal aporta dirección científica; los agentes y las habilidades solo se activan cuando el encargo autorizado requiere su trabajo.

## Contenido

- `research-roster.json` registra los roles, sus identificadores, modelos, habilidades y evidencia requerida al terminar.
- `roles/` contiene las instrucciones completas de cada rol, incluidos los límites de autorización y de delegación.
- `skills/` conserva el contenido íntegro de las veintiuna habilidades, incluidas las fuentes, licencias y atribuciones indicadas en `provenance/`.
- `scripts/`, `hooks/`, `references/` y `tests/` contienen los controles, operaciones y materiales que acompañan al equipo.
- `install.mjs` distribuye los archivos administrados bajo el perfil Codex indicado, conserva archivos y grupos de hooks ajenos, y registra el estado necesario para verificar la instalación.

El instalador escribe veinte archivos `research-*.toml` en `<CODEX_HOME>/agents`, veintiuna entradas `agent-forge-research-*` en `<CODEX_HOME>/skills` y los recursos compartidos en `<CODEX_HOME>/research-specialists`. Cada entrada de habilidad remite al contenido completo instalado. Si se omite `--codex-home`, se utiliza `CODEX_HOME` cuando está definida y, en caso contrario, el directorio `.codex` del perfil actual.

## Vista previa, instalación y verificación

Desde la raíz del repositorio, indica rutas absolutas para el perfil Codex, el registro de instalación, el intérprete Python 3.12 y el directorio autorizado para los registros científicos. La vista previa no instala archivos. Revisa el `fingerprint` que devuelve y úsalo exactamente al instalar:

```powershell
node packages/research-specialists/install.mjs preview --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>'
node packages/research-specialists/install.mjs install --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>' --expected '<fingerprint de la vista previa>'
node packages/research-specialists/install.mjs verify --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>'
```

La instalación conserva el modelo y el esfuerzo de razonamiento definidos por cada agente global. La dirección permanece en la conversación principal, que utiliza el modelo acordado `gpt-6-astra` con razonamiento `high` sin cambiar la configuración global. Para crear un especialista, `spawn-input` devuelve `agent_type` con el identificador del rol, `fork_turns: "none"`, `task_name`, `message` y el token de asignación. No devuelve argumentos `model` ni `reasoning_effort`, porque Codex los toma de la definición fija del rol.

La instalación declara los siete eventos de hooks del paquete y no modifica las aprobaciones de confianza nativa. En Codex, revisa los grupos de hooks declarados por el perfil y resuelve cualquier solicitud de confianza dentro de la interfaz nativa. La vista previa y la verificación del paquete no acreditan que Codex haya cargado los hooks ni que el usuario los haya aprobado.

## Revertir o retirar

Para restaurar la versión previa administrada por este paquete, prepara primero una vista previa de `rollback`; para retirar únicamente los archivos administrados por este paquete, prepara una vista previa de `uninstall`. Revisa el `fingerprint` y pásalo a la operación correspondiente:

```powershell
node packages/research-specialists/install.mjs preview --operation rollback --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>'
node packages/research-specialists/install.mjs rollback --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>' --expected '<fingerprint de la vista previa>'
node packages/research-specialists/install.mjs preview --operation uninstall --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>'
node packages/research-specialists/install.mjs uninstall --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>' --expected '<fingerprint de la vista previa>'
```

Estas operaciones administran solo las rutas y grupos de hooks registrados por el paquete. No restauran configuración global ajena, no borran datos científicos ni cambian aprobaciones de confianza.

## Comprobación del paquete

Desde la raíz del repositorio:

```powershell
node scripts/research-specialists.mjs check
node --test packages/research-specialists/tests/package.test.mjs packages/research-specialists/tests/research-session.test.mjs
node scripts/test-research-specialists.mjs --python '<intérprete Python absoluto>'
```

El comando `node --test` ejecuta los casos acotados de integridad del paquete y sesión usados para esta migración. El runner completo se conserva para cambios que requieran esa cobertura; no es un requisito general de migración. Estos comandos comprueban recursos e interfaces con los materiales indicados. No realizan investigaciones ni demuestran resultados científicos. El informe [de la migración para Codex Desktop](../../project_docs/research-desktop-plugin.md) explica los límites de instalación y verificación.
