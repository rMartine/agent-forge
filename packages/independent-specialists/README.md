# Especialistas independientes de Agent Forge

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

SubagentStart identifica únicamente los cuatro roles; PreToolUse comprueba las herramientas externas explícitas del manifiesto frente a autorizaciones de la asignación; PostToolUse conserva identificadores y estados. SubagentStop, Stop, Interrupt y SessionEnd informan y cierran sin crear ciclos de continuación. No hacen llamadas de red.

Las autorizaciones registradas provienen de encargos humanos existentes y no son aprobaciones nuevas de plataforma. Las herramientas alojadas, llamadas anidadas y navegador pueden quedar fuera de la interceptación. El registro, los hashes de texto y los máximos numéricos no son una garantía de aislamiento ni un sistema de contabilidad de consumo. La principal conserva la comprobación del alcance, datos y costo reales.

## Verificación acotada

Se comprueban sintaxis, referencias, conservación de archivos previos y carga de perfiles, skills y hooks por un proceso nuevo del cliente nativo de Codex. No se realizan encargos de demostración, generaciones, publicaciones, evaluaciones de calidad ni pruebas exhaustivas.
