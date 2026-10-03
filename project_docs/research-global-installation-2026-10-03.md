# Conversión del equipo de investigación a agentes globales

Fecha: 3 de octubre de 2026, America/New_York. Encargo: convertir la instalación existente conservando los veinte especialistas, sus modelos, veintiuna guías y siete eventos de hooks. No se rediseñaron responsabilidades ni se ejecutó investigación científica.

Estado: **instalación global comprobada; confianza y ejecución nativa de los hooks pendientes de aprobación en Codex**. El plugin `agent-forge-research@agent-forge-research-local` fue retirado mediante la operación nativa, que respondió `uninstalled`.

## Contenido conservado e instalación

Antes de modificar las fuentes se compararon los 246 archivos de contenido del plugin instalado con el repositorio: no había diferencias. Los archivos generados `runtime.json` y `package-integrity.json` coincidían con la copia recuperable de la versión 1.0.5. El catálogo de investigación permanece idéntico. En los veinte archivos de roles solo cambió la frase que explica dónde se fija el modelo; las demás líneas son idénticas. Las guías científicas, recursos, licencias y atribuciones se conservaron; se adaptaron las instrucciones comunes y de coordinación para la instalación global.

La instalación real escribió veinte agentes bajo `C:/Users/rober/.codex/agents`, veintiuna entradas de guías bajo `C:/Users/rober/.codex/skills` y los recursos compartidos bajo `C:/Users/rober/.codex/research-specialists`. Incluye los tres archivos de metadatos de Nature y conserva `allow_implicit_invocation: false` para sus recursos compartidos.

Se verificaron 317 archivos administrados: 272 archivos de recursos y configuración de ejecución, 44 definiciones y metadatos globales, y el inventario de integridad. Se conservaron los 91 archivos ajenos comprobados por el instalador y los grupos de hooks preexistentes. No se modificaron modelos globales, permisos ni registros de confianza. El intérprete Python y la ubicación previa de registros científicos se reutilizaron.

## Comprobaciones realizadas

- `node --test packages/research-specialists/tests/package.test.mjs packages/research-specialists/tests/research-session.test.mjs`: 49 aprobaciones, cero fallos y cero omisiones. Son pruebas locales de conversión, instalación y comportamiento de sesiones y hooks; no prueban calidad científica.
- `node scripts/research-specialists.mjs check`: veinte especialistas, veintiuna guías y 271 archivos fuente distribuibles.
- Vista previa, instalación, verificación, reinstalación y nueva verificación en un perfil temporal con el Python existente: correctas. La reinstalación final cambió cero archivos y conservó el agente, la guía y el hook ajenos usados como material de prueba.
- Verificación del perfil real: veinte agentes, veintiuna guías, siete grupos de hooks y 44 definiciones globales coincidentes con sus fuentes e inventario.
- Consulta nativa independiente a `Codex Desktop/0.160.0`: veintiuna guías globales reconocidas, ninguna procedente del plugin retirado; siete hooks habilitados, todos con `trustStatus: untrusted` en esta observación.
- Revisión del cambio preparado: sin archivos temporales, dependencias instaladas ni patrones de credenciales detectados. `git diff --cached --check` señaló los finales CRLF conservados por el módulo; la misma comprobación con `core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol` pasó sin normalizar los recursos.

No se ejecutaron la batería científica Python, investigaciones de demostración, comparaciones de modelos ni servicios científicos externos. Los comandos de recuperación selectiva están en [la documentación del módulo](../packages/research-specialists/README.md).

## Verificación nativa pendiente

Los hooks globales requieren confianza nueva en Codex. Se solicitó su aprobación al usuario después de instalar y verificar los archivos. No se editaron aprobaciones ni se eludió el control del cliente. Queda pendiente la única asignación nativa mínima acordada para observar el catálogo de agentes, creación, vinculación y cierre. La lectura de archivos y los casos controlados anteriores no se presentan como esa ejecución.

La evidencia local está en `D:/Proyectos/Agent Forge/research-global-validation`, incluidos los informes de instalación, preservación, comparación de contenido y consulta nativa. Los registros temporales y la configuración real no se incorporan a Git. La copia preparada anterior permanece en `D:/Proyectos/Agent Forge/installed-research-plugin/1.0.5` para recuperación; conservarla no mantiene el plugin instalado.
