# Equipo global de investigación para Codex Desktop

Los recursos de investigación viven en [`packages/research-specialists`](../packages/research-specialists/README.md). El instalador los distribuye en el perfil Codex como veinte agentes globales `research-*`, veintiuna habilidades globales `agent-forge-research-*`, recursos compartidos y siete grupos de hooks. El trabajo científico se activa por el encargo: la conversación principal conserva la dirección y delega solo cuando una actividad autorizada requiere un especialista. La existencia de agentes instalados no activa una investigación.

## Roles, modelos y responsabilidades

El [catálogo](../packages/research-specialists/research-roster.json) registra identificadores, responsabilidades, habilidades, evidencia de cierre y el modelo fijado para cada rol. Los modelos y niveles de razonamiento se incorporan en los TOML de agentes globales; al crear un especialista, el iniciador selecciona el `agent_type` que devuelve `spawn-input` y no agrega argumentos `model` ni `reasoning_effort`. Codex obtiene esa configuración de la definición instalada. La conversación principal usa el modelo acordado `gpt-6-astra` con razonamiento `high`; esa elección pertenece a la conversación y no modifica la configuración global.

La dirección científica permanece en la conversación principal. Solo esa conversación crea agentes de investigación; un especialista devuelve resultados a la conversación principal y no delega. La asignación conserva sus materiales, operaciones permitidas, resultado esperado, token de correlación y decisiones científicas reservadas a Roberto.

## Recursos científicos y procedencia

Los roles completos se conservan en [`roles/`](../packages/research-specialists/roles/); las habilidades completas, referencias y scripts permanecen bajo [`skills/`](../packages/research-specialists/skills/). Los veintiún puntos de entrada globales remiten a esas habilidades completas en el directorio compartido instalado bajo `CODEX_HOME/research-specialists`. Los archivos de procedencia, licencias y adaptaciones siguen en [`provenance/`](../packages/research-specialists/provenance/). Las herramientas de Zotero, Jupyter y `digital-twin-researcher` continúan siendo capacidades existentes y se usan solo cuando correspondan al encargo; la migración no las instala.

La política de operaciones científicas permanece en [`references/authorization-policy.md`](../packages/research-specialists/references/authorization-policy.md). Un registro documenta autorizaciones existentes pero no concede permisos. Los programas auxiliares comprueban rutas, destinos, modelos externos, credenciales, tamaños y límites declarados. La investigación conserva las decisiones metodológicas, fuentes, materiales, datos, actividades y límites que Roberto haya autorizado.

## Sesiones, hooks y registros

La instalación declara los siete eventos `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt` y `SessionEnd`. Las instrucciones y hooks de desarrollo siguen siendo grupos independientes. Los [procedimientos de ejecución](../packages/research-specialists/skills/direct-research/references/runtime.md) describen el registro de sesiones, asignaciones, identidad observada, evidencia y cierre. La sesión solo se registra cuando el encargo científico requiere este flujo.

El instalador registra una única ruta absoluta `sessionDataRoot` en `runtime.json`, compartida por los comandos y procesos de hooks. Debe quedar fuera del proyecto científico autorizado. Se conservan las comprobaciones de asignación y token, discrepancias de modelo, verificación de integridad, límites de autorización y ejecución Python. La correspondencia del identificador del agente por sí sola no sustituye la correlación de tarea y token.

La cobertura de herramientas es parcial. Un hook que no recibe una llamada de terminal anidada en `functions.exec` no puede comprobarla. Los programas auxiliares mantienen controles de rutas, destinos, credenciales, operaciones y límites. Un evento satisfactorio o un registro completo no acredita calidad científica, autenticidad de autorización ni aislamiento completo del sistema operativo.

## Vista previa, instalación y verificación

Desde la raíz del repositorio, indica rutas absolutas para el perfil Codex, el registro de instalación, el intérprete Python y el directorio autorizado de registros científicos. Ejecuta primero la vista previa y revisa su `fingerprint`; la instalación exige ese valor mediante `--expected`:

```powershell
node packages/research-specialists/install.mjs preview --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>'
node packages/research-specialists/install.mjs install --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>' --expected '<fingerprint de la vista previa>'
node packages/research-specialists/install.mjs verify --codex-home '<perfil Codex>' --state-home '<registro de instalación>' --python '<intérprete Python absoluto>' --data-root '<directorio absoluto de registros científicos>'
```

Las guías globales quedan en `<CODEX_HOME>/skills/agent-forge-research-<nombre>/SKILL.md`; los agentes quedan en `<CODEX_HOME>/agents/research-*.toml`; el catálogo, recursos compartidos y runtime quedan en `<CODEX_HOME>/research-specialists/`. Si `--codex-home` no se indica, el instalador usa `CODEX_HOME` o el perfil actual. Los grupos de hooks globales conservan las entradas ajenas al paquete.

Para revisar los archivos y comandos de comprobación del paquete desde la raíz:

```powershell
node scripts/research-specialists.mjs check
node scripts/test-research-specialists.mjs --python '<intérprete Python absoluto>'
```

La instalación prepara los grupos de hooks, pero no concede su confianza nativa. Revisa esa solicitud en Codex mediante su interfaz nativa; este procedimiento no edita las aprobaciones. La vista previa, la instalación y `verify` no demuestran que Codex haya descubierto los agentes o las habilidades ni que los hooks estén cargados o confiados. No se afirma aquí que la migración se haya instalado o que esos eventos se hayan observado.

## Estado histórico de la instalación anterior

El [informe de instalación del 2 de octubre de 2026](research-desktop-installation-2026-10-02.md) conserva lo observado en la instalación entonces distribuida como plugin y sus límites. Sus resultados describen esa instalación histórica; no acreditan el funcionamiento de los agentes globales, de las guías globales ni de los hooks después de esta migración.
