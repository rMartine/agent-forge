# Conversión del equipo de investigación a agentes globales

Fecha: 3 de octubre de 2026, America/New_York. Encargo: convertir la instalación existente conservando los veinte especialistas, sus modelos, veintiuna guías y siete eventos de hooks. No se rediseñaron responsabilidades ni se ejecutó investigación científica.

Estado: **instalación global comprobada; siete hooks aprobados por Roberto; catálogo y una invocación nativa comprobados**. La comprobación nativa terminó por límite de tiempo antes del cierre de la conversación principal; no se declara verificación operativa completa de ese cierre. El plugin `agent-forge-research@agent-forge-research-local` fue retirado mediante la operación nativa, que respondió `uninstalled`.

## Contenido conservado e instalación

Antes de modificar las fuentes se compararon los 246 archivos de contenido del plugin instalado con el repositorio: no había diferencias. Los archivos generados `runtime.json` y `package-integrity.json` coincidían con la copia recuperable de la versión 1.0.5. El catálogo de investigación permanece idéntico. En los veinte archivos de roles solo cambió la frase que explica dónde se fija el modelo; las demás líneas son idénticas. Las guías científicas, recursos, licencias y atribuciones se conservaron; se adaptaron las instrucciones comunes y de coordinación para la instalación global.

La instalación real escribió veinte agentes bajo `C:/Users/rober/.codex/agents`, veintiuna entradas de guías bajo `C:/Users/rober/.codex/skills` y los recursos compartidos bajo `C:/Users/rober/.codex/research-specialists`. Incluye los tres archivos de metadatos de Nature y conserva `allow_implicit_invocation: false` para sus recursos compartidos.

Se verificaron 317 archivos administrados: 272 archivos de recursos y configuración de ejecución, 44 definiciones y metadatos globales, y el inventario de integridad. Se conservaron los 91 archivos ajenos comprobados por el instalador y los grupos de hooks preexistentes. No se modificaron modelos globales, permisos ni registros de confianza. El intérprete Python y la ubicación previa de registros científicos se reutilizaron.

## Comprobaciones realizadas

- `node --test packages/research-specialists/tests/package.test.mjs packages/research-specialists/tests/research-session.test.mjs`: 49 aprobaciones, cero fallos y cero omisiones. Son pruebas locales de conversión, instalación y comportamiento de sesiones y hooks; no prueban calidad científica.
- `node scripts/research-specialists.mjs check`: veinte especialistas, veintiuna guías y 271 archivos fuente distribuibles.
- Vista previa, instalación, verificación, reinstalación y nueva verificación en un perfil temporal con el Python existente: correctas. La reinstalación final cambió cero archivos y conservó el agente, la guía y el hook ajenos usados como material de prueba.
- Verificación del perfil real: veinte agentes, veintiuna guías, siete grupos de hooks y 44 definiciones globales coincidentes con sus fuentes e inventario.
- Consulta nativa independiente a `Codex Desktop/0.160.0`, repetida después de la aprobación de Roberto y de la última instalación: veintiuna guías globales reconocidas, ninguna procedente del plugin retirado; siete hooks habilitados, todos con `trustStatus: trusted`.
- Se corrigió la lectura de la descripción YAML multilínea de `nature-response`, sin cambiar el procedimiento original. La regresión específica pasó y comprobó también las otras veinte descripciones; no se repitieron los 49 casos anteriores. La instalación actualizó cuatro archivos propios, volvió a verificar los 317 archivos administrados y conservó los 91 archivos ajenos y sus grupos de hooks. La consulta nativa reconoció la descripción completa.
- Revisión del cambio preparado: sin archivos temporales, dependencias instaladas ni patrones de credenciales detectados. `git diff --cached --check` señaló los finales CRLF conservados por el módulo; la misma comprobación con `core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol` pasó sin normalizar los recursos.

No se ejecutaron la batería científica Python, investigaciones de demostración, comparaciones de modelos ni servicios científicos externos. Los comandos de recuperación selectiva están en [la documentación del módulo](../packages/research-specialists/README.md).

## Verificación nativa y límite observado

Roberto aprobó los siete hooks en el cliente. No se editaron aprobaciones ni se eludió el control de confianza. Una sesión nueva del servidor nativo de Codex enumeró los veinte identificadores disponibles en la herramienta de colaboración y realizó una sola asignación de reconocimiento de responsabilidad, sin búsqueda científica ni llamadas a servicios científicos externos.

La sesión `01a10073-2697-7dc2-b369-8f67e56a45f7` creó la asignación `assignment-0459398b-52a1-482d-a80b-8c128b8c83f3`. Codex creó el subagente `01a10075-ff0c-7d81-96bb-d6b87a7b9481`, que respondió confirmando su responsabilidad de búsqueda bibliográfica. El registro correlacionó automáticamente esa identidad con `research-literature-search` y observó el modelo `gpt-6.1-sol`, sin discrepancia. El razonamiento `high` quedó comprobado en la configuración, no como observación independiente de ejecución. El mensaje nativo opaco no se comparó con el texto esperado; el registro lo identifica como `opaque-native-message-not-compared`.

Los eventos nativos de investigación observados fueron `PreToolUse` (16), `PostToolUse` (16), `SubagentStart` (1), `SubagentStop` (1) e `Interrupt` (1), con ejecución completada. El proceso de comprobación alcanzó su límite de 240 segundos después de la respuesta del subagente y antes del registro de evidencia y cierre de la conversación principal. Se interrumpió y el registro quedó `interrupted`, sin reanudación. No se observaron `Stop` ni `SessionEnd` de la conversación principal en esta ejecución; esos comportamientos cuentan únicamente con los casos controlados previamente ejecutados.

La conversación de implementación intentó registrar la evidencia de la respuesta, pero el programa rechazó correctamente la modificación porque solo la sesión principal original puede cambiar ese registro. No se sustituyó su identidad ni se alteró manualmente el estado. La evidencia observada se conserva en los archivos externos indicados abajo. No se repitió la asignación ni se amplió la comprobación.

La evidencia local está en `D:/Proyectos/Agent Forge/research-global-validation`, incluidos los informes de instalación, preservación, comparación de contenido y consulta nativa. Los registros temporales y la configuración real no se incorporan a Git. La copia preparada anterior permanece en `D:/Proyectos/Agent Forge/installed-research-plugin/1.0.5` para recuperación; conservarla no mantiene el plugin instalado.
