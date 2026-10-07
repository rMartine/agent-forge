# Roster de Comunicación y Formación

Cuatro perfiles nativos para Codex: marketing y ventas, marca y diseño gráfico, educación para adultos y producción audiovisual. No pertenecen a los equipos de investigación o desarrollo. Se coordinan a través de la conversación principal y de la skill `independent-specialist-coordination`.

Marketing y educación usan `gpt-6-astra`; marca y audiovisual usan `gpt-6.1-sol`. Los cuatro tienen razonamiento `high`. Los TOML son la configuración de origen; una carga nativa confirma reconocimiento, no calidad de resultados ni uso observado del modelo en una ejecución.

## Instalar y mantener

Desde este directorio, con Node 22 o posterior:

```text
node install.mjs preview
node install.mjs install --expected <fingerprint-devuelto>
node install.mjs verify
node install.mjs preview --operation rollback
node install.mjs rollback --expected <fingerprint-devuelto>
node install.mjs preview --operation uninstall
node install.mjs uninstall --expected <fingerprint-devuelto>
```

La vista previa no modifica archivos. La instalación exige la huella de una vista previa vigente. Cada actualización rechaza archivos propios alterados y destinos ajenos. La reversión restaura la versión propia anterior; si fue la primera instalación, retira exclusivamente esa instalación. La desinstalación conserva archivos ajenos y los registros locales de encargos. No se borran directorios recursivamente.

Los destinos son `CODEX_HOME/agents`, `CODEX_HOME/skills`, `CODEX_HOME/independent-specialists` y grupos propios en `CODEX_HOME/hooks.json`; por defecto CODEX_HOME es `~/.codex`. El registro independiente se guarda en `~/.agent-forge-independent-specialists/state.json`. Las opciones `--codex-home` y `--state-home` permiten elegir rutas explícitas. El instalador no altera los instaladores de los equipos existentes, sus archivos, modelos o configuración de permisos.

Los hooks deben ser reconocidos y aceptados mediante los controles de confianza de Codex. La instalación no concede confianza, no deshabilita revisiones y no ejecuta acciones externas para comprobar conexión. Si Codex indica que hooks.json cambió, revisa su contenido en la interfaz nativa; no edites los registros internos de confianza ni uses opciones para omitirla.

## Uso

Pide a Codex que delegue al especialista de marketing, marca, educación para adultos o producción audiovisual. Los nombres técnicos exactos están en `manifest.json`. Las skills se pueden seleccionar automáticamente cuando la tarea corresponda; no necesitan activarse todas juntas.

Canva se usa para todo material gráfico. ElevenLabs se usa para voz y transcripción; sus skills oficiales ya instaladas se leen cuando son necesarias. Shotstack se usa para montaje mediante la integración oficial `https://mcp.shotstack.io/`. Si no está conectada, la conexión se informa como pendiente y se realiza cuando el usuario la complete; no se sustituye por otros proveedores ni se fabrican resultados. Disponer de una integración no autoriza publicación, uso de datos sensibles o consumo permanente.

No se compran guías o skills. `sources.json` conserva origen, versión, licencias y cambios. Se distribuyen adaptaciones documentales, sin ejecutables de los repositorios de terceros. Las modificaciones educativas sujetas a CC BY-SA mantienen esa licencia; consulta su aviso individual.

## Hooks y límites

SubagentStart identifica únicamente los cuatro roles; PreToolUse comprueba las herramientas externas explícitas del manifiesto frente a autorizaciones de la asignación; PostToolUse conserva identificadores y estados. SubagentStop devuelve la asignación; Stop informa sin cerrarla; Interrupt suspende y SessionEnd termina. Los avisos idénticos no se repiten ni crean ciclos de continuación. No hacen llamadas de red.

Las autorizaciones registradas provienen de encargos humanos existentes y no son aprobaciones nuevas de plataforma. Las herramientas alojadas, llamadas anidadas y navegador pueden quedar fuera de la interceptación. El registro, los hashes de texto y los máximos numéricos no son una garantía de aislamiento ni un sistema de contabilidad de consumo. La principal conserva la comprobación del alcance, datos y costo reales.

## Verificación acotada

Se comprueban sintaxis, referencias, conservación de archivos previos y carga de perfiles, skills y hooks por un proceso nuevo del cliente nativo de Codex. No se realizan encargos de demostración, generaciones, publicaciones, evaluaciones de calidad ni pruebas exhaustivas.

## Hooks: nombres, estado y recuperación

Los nombres visibles usan `Roster de {nombre} | {ámbito} | {evento} | {acción}` en statusMessage. Los cuatro nombres son Roster de Desarrollo, Roster de Investigación, Roster de Comunicación y Formación y Roster de Consultoría. El ámbito es el agente cuando el hook es exclusivo, Especialistas cuando es compartido y Sesión para Stop, Interrupt y SessionEnd. No se cambian identificadores técnicos ni se duplican hooks para mostrar etiquetas.

Las actualizaciones reemplazan cada grupo en su posición; no mueven los grupos ajenos. Cambiar una definición puede requerir renovar su confianza en Codex. El registro del instalador debe acompañar cualquier cambio de archivos administrados; no editar solamente la copia instalada.

La resolución usa la identidad registrada del agente y su proyecto. Los subdirectorios conservan las restricciones; cambiar a otro proyecto o a un repositorio anidado requiere registrar el encargo correspondiente. Un estado corrupto produce un diagnóstico sin datos del encargo y bloquea PreToolUse para el agente propio identificado. Un agente ajeno no queda bloqueado por ese error.

Los archivos .lock no se eliminan automáticamente por antigüedad. Para recuperar uno, con los encargos detenidos, ejecutar el helper hook-storage.mjs junto a los scripts con `recover-lock RUTA_ABSOLUTA.lock`. Solo si identifica un PID terminado devolverá sha256; aplicar con `recover-lock RUTA_ABSOLUTA.lock --apply --expected SHA256`. Conserva un recibo local. Un propietario activo o desconocido impide la recuperación: conservar el archivo y revisar offline el proceso y el registro antes de una intervención manual. No borrar bloqueos en lote.

En Comunicación y Consultoría, Stop conserva el estado de la asignación. SubagentStop marca returned; Interrupt marca interrupted. Reanudar exige el comando resume desde la conversación principal correspondiente; SubagentStart no reanuda una interrupción. El cierre explícito o SessionEnd termina el encargo. Consultoría mantiene las prohibiciones después del cierre.

## Biblioteca compartida de estilos

Este paquete administra una única copia de `communication-design-styles` en el directorio global de skills de Codex. Incluye Futuristic, Levels, Clean, Dithered, Editorial y Glassmorphism. El principal y los cuatro especialistas pueden consultarla cuando corresponda; UX y Frontend son consumidores, sin duplicar la biblioteca. Los cursos sin identidad ni estilo indicado requieren consultar a Roberto antes del diseño visual. Los originales, licencia, revisión fijada y hashes se conservan dentro de la skill.

La biblioteca se instala, verifica y revierte con este mismo instalador. Desinstalar el paquete también retira su biblioteca; los consumidores deben informar su ausencia, sin descargarla automáticamente. No se añaden hooks ni se cambia su lógica.
