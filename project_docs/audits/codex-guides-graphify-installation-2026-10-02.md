# Instalación de guías, modelos y Graphify en el perfil de Codex

El despliegue local `2026-10-03T01-40-22-044Z-596d23` se aplicó correctamente el 2 de octubre de 2026 en la zona horaria de Roberto, con fecha UTC del 3 de octubre. Su fuente es el commit `0515f25b3cc2deb4206244ea616d2e48c80271f7` de `codex/software-product-agents`. Se instalaron o actualizaron 74 archivos y se conservaron 167 iguales; no hubo fallos ni eliminaciones.

La instalación de archivos y el comportamiento observado en cada cliente son resultados separados. Las comprobaciones de los clientes se indican abajo; la existencia de este informe no las sustituye.

## Inventario instalado

| Componente | Resultado comprobado |
|---|---|
| Agentes | 16 TOML en `C:/Users/rober/.codex/agents`, con modelo y razonamiento explícitos. Nueve Sol/high, dos Sol/medium y cinco Luna/high. |
| Guías y procedimientos | 18 skills administradas en `C:/Users/rober/.agents/skills`: dirección técnica, cinco paquetes propios y doce entradas externas. Sus recursos suman 224 archivos del plan. |
| Hooks | Un archivo compartido en `C:/Users/rober/.codex/hooks.json`: 16 grupos SubagentStart, 16 SubagentStop y uno para cada evento Stop, Interrupt y SessionEnd. Conservan nombres legibles en español. |
| Graphify | Paquete graphifyy 0.9.74, Python privado 3.12.13 y 31 wheels fijados bajo `C:/Users/rober/.agent-forge/graphify`. |
| Integridad | El comando de estado posterior devolvió `synced` para los 241 archivos administrados y el runtime registrado. |

La [matriz completa](../architecture/codex-product-agents.md) relaciona cada especialista con su responsabilidad, modelo, guías y evidencia de hooks. La [comparación de modelos](codex-model-comparison.md) documenta las 32 asignaciones: 29 cumplieron y tres no cumplieron todos los criterios. La decisión usa las categorías de costo acordadas; no se midieron precios de suscripción ni consumo real de cada configuración.

La [revisión de guías](codex-product-guides-review.md) conserva candidatos, revisiones, licencias, adaptaciones y rechazos. Impeccable sigue provisional y exige una solicitud explícita de uso o comparación. Anthropic frontend-design mantiene la asignación general mientras no se complete la comparación visual pendiente. Emil y Taste tienen condiciones de participación por interacción, movimiento, límites de datos y páginas comerciales; no imponen cambios de plataforma ni dependencias de Liravo o Skillara.

## Plan exacto y preservación

El plan guardado es `C:/Users/rober/.agent-forge/plans/2026-10-03T01-40-22-044Z-596d23.json`. Antes de aplicarlo se verificaron 43 archivos nuevos, 31 modificados, 167 iguales y cero rutas fuera de los destinos previstos. No se descargaron ni resolvieron versiones nuevas durante la aplicación.

El plan de Graphify incluido tiene identificador `0ba244c03101e8caeb3231898cb206c1a3793decd0222b65bd18b48dcddabe64` y hash de dependencias `40addf1c7bf8791485bffcabd2dc74703cb54c0d198048206a7fc636733b9632`. La aplicación instaló los bytes ya congelados del intérprete, paquetes y ayudantes. El cliente portable pertenece a la skill de dirección; no depende de una instalación global de Agent Forge.

El inventario previo capturó hashes de 85 archivos de configuración, agentes y entradas de skills personales; el posterior contiene 91. Entre las rutas anteriores fuera del plan solo cambió `C:/Users/rober/.codex/config.toml` durante el intervalo de comprobación y apertura de otra sesión de Codex. El instalador no incluye ni escribe ese archivo; no se atribuyó el cambio a un proceso sin evidencia, ni se restauró sobre la configuración personal. Este inventario de entradas no representa una comparación exhaustiva de todos los recursos personales. Los 241 archivos administrados sí fueron comprobados por el comando de estado.

No se publicaron ramas, instalaron servicios externos ni modificaron los repositorios de Liravo o Skillara. La extensión instalada de Codex para VS Code se identificó como `openai.chatgpt@26.930.21537`. Las pruebas de la extensión Agent Forge son distintas de las conversaciones en esa extensión de Codex.

## Comprobaciones reutilizadas y correcciones finales

| Material o comando | Resultado y alcance |
|---|---|
| Compilación final de núcleo, CLI y extensión | Aprobada. Se necesitó ejecución específica fuera del sandbox para sobrescribir algunos compilados que devolvían EPERM; no se cambiaron permisos ni políticas de los agentes. |
| Validación estricta del roster para ambos destinos | Aprobada antes del commit. Incluye formatos y coherencia; no simula una conversación. |
| Pruebas previas del cambio | Se reutilizan las comprobaciones de manifiesto, generación, modelos, guías, hooks, comandos y extensión ya registradas. No se volvió a ejecutar toda la batería después de la corrección final. |
| Corrección final de instalación y recuperación | 28 pruebas seleccionadas aprobadas en `graphify-transaction-recovery`, `deployment`, `rollback` y `shared-hooks`; incluyen seis regresiones nuevas con archivos temporales reales y fallos controlados. |
| Graphify real en Windows | Se reutilizan las dos pruebas reales de extracción, consultas, actualización, límites e integridad y las tres comprobaciones de transacción conjunta descritas en su [informe](graphify-integration.md). No se repitió esa ejecución extensa. |
| Producto temporal y seis escenarios | Se reutiliza la [evidencia previa](codex-product-installation-2026-10-02.md) de construcción con interfaz, API y SQLite, y la [evaluación guiada](codex-product-forward-evaluation.md). No se presenta como una prueba nueva de las guías añadidas. |

Los dos defectos finales se observaron antes de instalar: una modificación concurrente durante el aprovisionamiento podía sobrescribirse, y un fallo parcial de recuperación podía impedir el siguiente intento. La aplicación ahora comprueba de nuevo los archivos antes de sustituirlos o eliminarlos. La recuperación conserva progreso junto a los respaldos, reconoce únicamente su predecesor exacto y mantiene activo el despliegue pendiente mientras haya errores. No se afirma resistencia demostrada a pérdida de energía o caída abrupta del sistema.

Los materiales de esta instalación están en `.cache/installation-evidence/`, excluidos de Git. Incluyen planes resumidos, inventarios de hashes, estado y resultados del cliente Graphify. Las fuentes y decisiones verificables permanecen versionadas; los logs, datos temporales y entornos instalados no.

## Comprobación de los clientes y pendientes

El cliente Graphify instalado creó un índice nuevo de dos archivos Python sintéticos: cuatro nodos y cinco relaciones, con estado `fresh`. La consulta `explain make_invoice` devolvió la definición en `service.py:3` y su llamada a `invoice_total` en la línea 4, comprobables contra los dos archivos suministrados. Se comprobó contra su runtime del perfil real; no se indexaron Liravo, Skillara, documentos o datos personales.

La sesión nueva de Desktop `01a0ff6e-faa1-7300-a464-11910011e67e` terminó. Descubrió y leyó la guía de dirección y la guía de ingeniería, y convocó `qa-engineer` sin sobreescribir su modelo. Reutilizó siete archivos cuyos hashes se conservaron y ejecutó una sola vez el caso existente de persistencia después de reiniciar el proceso: una prueba aprobada, cero fallas. No reconstruyó el producto ni repitió las ocho pruebas. La evidencia queda en `C:/Users/rober/Documents/Codex/2026-10-02/agent-forge-installed-client-check/outputs/evidence-desktop.json`.

Se observó `gpt-6-luna` en SubagentStart, coincidente con la configuración instalada. El registro del especialista informa razonamiento high; el identificador del modelo del hook por sí solo no acredita ese esfuerzo. SubagentStop produjo una continuación nativa por evidencia ausente, documentada en la sesión del especialista. Después de la respuesta final, el registro principal pasó de activo a inactivo sin llamar manualmente a hooks ni a `deactivate`: se observó el efecto persistido de Stop, no su objeto original. No se editaron registros de confianza.

El ensayo detectó una incompatibilidad en la asignación: el coordinador pidió reservar el registro al principal, aunque la configuración de calidad establece `evidenceWriter: agent`. El especialista registró evidencia al recibir la continuación y después negó haber recibido ese evento; el principal contrastó la sesión real y corrigió esa afirmación en la evidencia integrada. No se presenta el ensayo como cumplimiento perfecto de instrucciones. El procedimiento preparado para VS Code aclara quién registra según `evidenceWriter`; no se modificó el comportamiento instalado ni se repitió el ensayo por ese ajuste de instrucciones.

Para VS Code se prepararon las mismas fuentes sin datos en `D:/Proyectos/Agent Forge/codex-vscode-acceptance`, junto a `PRUEBA.md`. El intento anterior de enviar el mensaje quedó impedido por la ausencia de control de aplicaciones nativas. El 3 de octubre, después de que Roberto reanudó el encargo, la herramienta de control de Windows estuvo disponible y permitió enviar el mensaje directamente en la extensión Codex, versión `26.930.31730`. Se confirmó la confianza únicamente de esa carpeta temporal revisada porque VS Code había deshabilitado Codex en modo restringido; no se cambiaron políticas de ejecución ni la selección del modelo principal.

La conversación `01a1001b-6980-7cc2-9d1b-c253521b543d`, titulada «Verifica entrega Agent Forge», convocó `qa-engineer` sin sobreescribir su modelo. El especialista `01a1001d-6feb-7721-b8c6-d4d6cce2f183` ejecutó una sola vez `node --test --test-name-pattern="mantiene pendientes" test/api.test.mjs`: una prueba aprobada, cero fallas y salida 0. La salida real TAP acredita la persistencia después de terminar el proceso y arrancar otro; el aviso experimental de SQLite no impidió la ejecución. El registro `turn_context` del especialista identifica `gpt-6-luna` y esfuerzo `high`. El principal conservó `gpt-6-astra` y esfuerzo `xhigh`.

El ejecutor del principal falló antes de iniciar PowerShell con `helper_unknown_error: setup refresh had errors`. La lectura mediante el intérprete JavaScript también falló por el mismo problema de preparación. No pudo activar el registro temporal del producto, y el especialista no recibió metadatos de `SubagentStart`. Por tanto, esta conversación acredita el descubrimiento y uso del especialista y su modelo, y la ejecución de la prueba, pero no acredita el funcionamiento nativo de `SubagentStart`, `SubagentStop` ni `Stop` de Agent Forge en VS Code. No se ejecutaron hooks manualmente, no se sustituyó esta prueba por una ejecución desde Desktop y no se repitió la prueba aprobada. El registro integrado del coordinador de esta entrega se guarda como `.cache/installation-evidence/vscode-observation.json`, separado de cualquier evidencia que consiga guardar la conversación de VS Code.

Al reanudar, `status --target codex --json` siguió devolviendo `synced` para el despliegue `2026-10-03T01-40-22-044Z-596d23`; se conserva su resultado en `.cache/installation-evidence/status-resumed.json`. No se reinstalaron archivos ni se repitieron las baterías anteriores.

La comparación visual de Impeccable continúa pendiente: Browser Use rechazó abrir los archivos locales preparados y prohibió intentar la misma apertura mediante otra ruta. No se sirvieron esos archivos por otro medio para eludir el rechazo. Sus comprobaciones estáticas y límites están en el [informe de diseño](codex-design-guide-comparison.md).

La integración en `development` queda pendiente de cerrar las comprobaciones aplicables de los clientes y diseño. El trabajo implementado e instalado está recuperable en la rama dedicada; no se declara completado todo el encargo mientras continúen esos pendientes.

## Recuperación

Desde `D:/Repositorios/agent-forge`, para recuperar el despliegue anterior mediante los respaldos registrados:

```powershell
node packages/cli/dist/index.js --repo . rollback --target codex --deployment 2026-10-03T01-40-22-044Z-596d23
```

El comando muestra su confirmación antes de actuar. Los respaldos y el progreso de recuperación están bajo `C:/Users/rober/.agent-forge/deployments/2026-10-03T01-40-22-044Z-596d23`. Se preservan modificaciones posteriores y se informa cualquier archivo que no pueda recuperarse. Si una operación falla, se corrige el impedimento concreto y se reintenta el mismo despliegue; no se borran manualmente archivos personales ni registros de confianza.

Como este despliegue creó el runtime de Graphify, también recupera su puntero anterior, que estaba ausente. Conserva las versiones y los índices para recuperación. Esto no implica borrar todo el directorio de Graphify ni afecta una instalación independiente que no pertenezca a ese plan.
