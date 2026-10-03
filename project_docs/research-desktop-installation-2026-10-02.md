# Instalación del equipo de investigación en esta workstation

Actualización del 3 de octubre de 2026, zona America/New_York. Estado: **plugin implementado e instalado; carga nativa y creación, vinculación y respuesta de especialistas comprobadas con las cuatro combinaciones de modelo y razonamiento del plan. La aceptación científica integral no se declara completada; las comprobaciones y sus límites se distinguen abajo**.

Se instaló `agent-forge-research@agent-forge-research-local`, versión `1.0.5`, mediante los comandos nativos de Codex. No se desplegó a otra workstation ni se publicaron cambios remotos. El paquete incluye veinte definiciones de especialistas, una dirección, veintiuna skills y siete hooks. Las responsabilidades y los modelos corresponden al [catálogo implementado](../plugins/agent-forge-research/research-roster.json).

## Ubicaciones comprobadas

| Componente | Ubicación |
|---|---|
| Catálogo local y versión preparada | `D:/Proyectos/Agent Forge/installed-research-plugin/1.0.5` |
| Plugin instalado por Codex | `C:/Users/rober/.codex/plugins/cache/agent-forge-research-local/agent-forge-research/1.0.5` |
| Entorno científico Python 3.12 | `D:/Proyectos/Agent Forge/research-runtime/python312` |
| Ubicación configurada para registros | `C:/Users/rober/AppData/Local/AgentForge/research-plugin-data` |
| Materiales y observaciones locales de validación | `D:/Proyectos/Agent Forge/research-plugin-validation` |

El inventario del paquete instalado contiene 247 archivos y coincide con el preparado, según `research-plugin.mjs verify`. Su SHA-256 agregado es `6e7aa1ff7553460fd6d7ae73fed24463fde974ac84a2b91af8c4ad24998af43e`. Las versiones preparadas anteriores se conservan para recuperación. Los hashes son comprobaciones de integridad, no firmas ni garantías absolutas contra modificaciones por quien controla la workstation.

## Resultados ejecutados

La siguiente lista contiene las comprobaciones realizadas para esta entrega y sus límites:

- **77 pruebas específicas aprobadas en la versión 1.0.1:** 43 de Node y 34 de Python, mediante `npm run test:research -- --python <intérprete de validación>`. Abarcan asignación/modelos declarados, correlación de subagentes con eventos controlados, cierre sin ciclos, separación entre proyectos, autorización, credenciales, rutas, solicitudes concurrentes, modelos externos, redirecciones, escrituras, inclusiones LaTeX y programas científicos representativos. La versión anterior tenía 74 pruebas aprobadas.
- **41 pruebas de sesiones y hooks aprobadas con la corrección de 1.0.5.** Tras exponer en el estado público el límite de comparación de instrucciones, se ejecutaron nuevamente las dos pruebas afectadas y ambas pasaron. Se comprobó que el transporte opaco no se sustituya ni se registre, que los modelos incorrectos y los paquetes alterados se rechacen y que se retire un diagnóstico de identidad pendiente cuando la vinculación ya existe. No se repitió la batería Python, cuyos archivos no cambiaron en esta corrección.
- **21 skills aceptadas por el validador oficial**, ejecutado con codificación UTF-8. Los campos de compatibilidad de K-Dense se conservaron dentro de sus metadatos.
- **32 archivos Python analizados sintácticamente** durante la verificación de fuentes. El entorno científico quedó instalado con versiones y hashes fijados; `pip check` no encontró dependencias incompatibles.
- **Compilación general de Agent Forge aprobada.** La batería general de core produjo 31 aprobaciones y tres fallos por correspondencia de `handoffs` en las definiciones de `cto`, `requirements-engineer` y `project-manager` de la base `cf76a73`. Este cambio no modifica esos archivos. La ejecución general se detuvo allí; no se presenta como aprobada toda la batería del producto.
- **Instalación y carga nativa observadas.** Una consulta local independiente al app-server de `Codex Desktop/0.159.0-alpha.12.1` devolvió el plugin como instalado y habilitado, 21 skills cargadas y los siete eventos previstos. No creó chats ni ejecutó investigación. Esa consulta no demuestra ejecución de hooks en la ventana de Desktop.
- **Integridad instalada comprobada.** `research-plugin.mjs verify` confirmó la coincidencia de los 247 archivos. El lanzador instalado ejecutó el formateador BibTeX sobre una referencia ficticia local y produjo el archivo esperado usando su Python registrado, sin solicitudes externas.
- **Registro instalado comprobado.** El programa de sesiones instalado leyó un archivo JSON mediante `--input-file`, creó el registro de comprobación en la ubicación configurada, guardó su evidencia y lo cerró. No se crearon especialistas en esa prueba.
- **Recuperación comprobada.** Se retiró únicamente este plugin y se reinstaló la misma versión preparada. Se conservó el catálogo recuperable, las entradas previas de plugins, el modelo global y el razonamiento global. Los 197 archivos de agentes y skills existentes registrados antes de instalar conservaron sus hashes. La retirada eliminó únicamente la caché correspondiente al plugin seleccionado.
- **Servicios externos simulados.** Las pruebas HTTP y de OpenRouter usaron materiales y respuestas controlados. No se realizó ninguna llamada de pago ni una búsqueda bibliográfica real para esta validación.

Los hallazgos de revisión sobre credenciales en cabeceras adicionales, JSON enviado como texto, segmentos ambiguos en URLs y ejecución de programas ajenos al inventario fueron corregidos y cuentan con pruebas de regresión. La dirección y los hooks usan ahora una ubicación común de registros; `--input-file` permite leer las asignaciones como archivos JSON sin confundirlas con texto JSON en la línea de comandos.

La revisión previa al commit no encontró archivos reales de entorno, credenciales identificables, dependencias instaladas ni resultados temporales entre los archivos preparados. Se ejecutó `git diff --cached --check`: los recursos externos conservan finales de línea de Windows, espacios de formato Markdown y líneas finales existentes. Con `cr-at-eol` para reconocer los finales de línea conservados quedan 411 observaciones de formato en las nueve skills externas; no se presentan como una comprobación de espacios en blanco aprobada. Se conservaron esos bytes y sus hashes de procedencia, en lugar de modificar masivamente los recursos por formato. Los archivos propios no conservan observaciones de esa comprobación.

## Estado observado de los hooks

Después de que Roberto aceptó los hooks, el cliente devolvió **`trustStatus: trusted`** y **`enabled: true`** para los siete: `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt` y `SessionEnd`. Tras instalar `1.0.1`, la consulta nativa conservó esos estados y mostró las rutas de la versión nueva. La definición de los comandos no cambió; no se editaron los registros de confianza. Los archivos locales `native-client-after-trust.json` y `native-client-version-1.0.1.json`, dentro de la carpeta de validación, conservan ambas observaciones. Confianza y carga no acreditan por sí solas la ejecución de los controles.

La observación más reciente, `native-client-version-1.0.5.json`, confirma la carga de las 21 skills y los siete hooks confiables con las rutas de `1.0.5`, usando `Codex Desktop/0.160.0`. El verificador confirmó también los 247 archivos instalados. Las definiciones de comandos de los hooks no cambiaron y no fue necesaria otra aceptación de confianza.

La [documentación de OpenAI](https://developers.openai.com/plugins/build/plugins) establece que instalar un plugin no concede confianza a sus hooks. El usuario debe revisar la definición vigente en el control de hooks del cliente. No se editaron registros de confianza ni se utilizó la opción de omitir esa revisión.

La primera dirección de prueba fue un subagente real, `01a0ff61-94d4-7213-86f0-ab5006670f2b`. Su `turn_context` confirmó `gpt-6-astra/high`. El chat principal de implementación conservó `gpt-6-astra/xhigh`; no se cambió su modelo ni la configuración global. La dirección creó un especialista de revisión, pero dos consultas mantuvieron su asignación en `prepared`, sin identidad vinculada ni modelo observado por el plugin. Se interrumpió ese especialista, se registró la limitación y se cerró la sesión. No se aceptaron resultados científicos ni se ejecutaron las otras tres combinaciones bajo la misma causa.

La versión `1.0.1` corrige el tratamiento de la terminal nativa `Bash` con `tool_input.command`, conservando las formas anteriores `exec_command` con `cmd`. También reconoce `collaborationspawn_agent`, nombre observado en el registro de despacho del cliente. Una prueba controlada cubre su secuencia completa de validación y vinculación. El registro de despacho no demuestra qué recibió un hook; no se atribuye la falta de vinculación exclusivamente a ese nombre. Los analizadores de comandos, las restricciones de solo lectura y las comprobaciones de autorización e integridad permanecen vigentes.

La repetición histórica con `1.0.1` mantuvo la asignación `prepared` sin identidad vinculada. Una prueba adicional desde el chat principal, con el especialista de referencias y argumentos explícitos `gpt-6.1-sol/medium`, tuvo el mismo resultado. Se interrumpieron ambas asignaciones y se registraron sus limitaciones mediante el programa de sesiones, sin modificar registros manualmente ni simular eventos. Esa corrección por sí sola no resolvió la falta de vinculación. La evidencia de la prueba principal está en `desktop-acceptance/main-director-evidence.json`; la de la dirección como subagente, en `desktop-acceptance/01a0ff61-94d4-7213-86f0-ab5006670f2b/version-1.0.1/acceptance-report.md`, dentro de la carpeta de validación.

Roberto autorizó abrir el chat de validación `01a0ff78-a536-7d00-aa54-20f2a01e2e2c`. En esa sesión nueva sí se observó la actuación de `PreToolUse`: rechazó la creación porque el mensaje recibido por el hook no coincidía con las instrucciones preparadas. El diagnóstico comprobó únicamente diferencias entre campos, sin guardar sus contenidos. La versión intermedia `1.0.4` consiguió crear y vincular al especialista al devolver las instrucciones mediante `updatedInput`, pero el cliente falló antes de su respuesta con un error de descifrado. Ese intento se registró como fallido; no se aceptó como funcionamiento completo.

La versión `1.0.5` conserva el mensaje opaco que entrega el transporte nativo `collaborationspawn_agent`. Comprueba los demás argumentos, el nombre de tarea preparado, el identificador de llamada y la integridad del paquete; declara `opaque-native-message-not-compared`. Reconocer el formato opaco no comprueba autenticidad ni coincidencia de instrucciones. Cuando puede vincular la identidad, `SubagentStart` aporta la tarea preparada como contexto adicional. No se descifraron mensajes ni se buscaron claves del cliente. Los controles de autorización de los programas auxiliares permanecen separados de esta cobertura parcial.

En la primera comprobación de `1.0.5`, una sola creación produjo el especialista `01a10023-628a-7590-bb7c-cc60d36a8bc8`, vinculado a `assignment-1871bd39-3467-4021-b138-6eb7ddfae2ae`. Devolvió `research-bibliographic-references`, el identificador correcto y «Asignación recibida». `status` mostró `observedModel: gpt-6.1-sol`, sin discrepancia ni aviso de identidad pendiente; el `turn_context` del especialista confirmó razonamiento `medium`. La dirección del chat de validación confirmó `gpt-6-astra/high`. Se guardó evidencia de ambos y la sesión terminó con la asignación completada. `fresh-desktop-chat/informe-1.0.5.md` conserva esa observación.

La comprobación de las otras tres combinaciones también recibió los identificadores y el acuse. Esta tabla reúne las cuatro combinaciones del catálogo; cada una utilizó una sola creación en `1.0.5` y verificó el modelo y el razonamiento en el `turn_context` nativo del especialista:

| Especialista probado | Modelo y razonamiento observados | Identidad vinculada |
|---|---|---|
| Referencias bibliográficas | `gpt-6.1-sol/medium` | `01a10023-628a-7590-bb7c-cc60d36a8bc8` |
| Búsqueda bibliográfica | `gpt-6.1-sol/high` | `01a10028-9af6-7c41-bea9-f2b806aecc0f` |
| Escritura científica | `gpt-6-astra/medium` | `01a1002a-b4bb-74f1-82f4-5bee51f9e2d1` |
| Revisión científica independiente | `gpt-6-astra/high` | `01a1002d-334f-7f10-a4ee-5f2f066a5a96` |

Escritura añadió un punto final a «Asignación recibida»; sus identificadores fueron correctos y no se afirma igualdad carácter por carácter. Los cuatro registros declararon la limitación `opaque-native-message-not-compared`, sin discrepancias de modelo ni diagnósticos de identidad pendiente. Los archivos `specialist-evidence-input-1.0.5.json` y `evidence-<roleId>-input-1.0.5.json`, dentro de `fresh-desktop-chat`, conservan las respuestas y las rutas nativas observadas. Las pruebas se limitaron a recibir la asignación y confirmar la configuración, sin búsquedas ni escritura o revisión de documentos científicos.

En la comprobación posterior a la actualización se conservaron el modelo global, el razonamiento global y todas las entradas previas de plugins. La comparación con el inventario anterior a la instalación encontró 31 archivos de agentes o skills de desarrollo con hashes diferentes. La prueba previa de retirada y reinstalación de `1.0.0` había confirmado los 197 archivos sin diferencias. No se atribuyen estas diferencias posteriores a la actualización científica ni se restauran archivos ajenos: los comandos de este cambio se limitaron al plugin de investigación y su catálogo. `preservation-version-1.0.1.json` conserva la comparación, sin presentar como vigente una coincidencia de hashes que ya no existe.

Alcance de la aceptación y comprobaciones todavía no acreditadas:

1. Las cuatro combinaciones de modelo y razonamiento quedaron comprobadas mediante el acuse breve y el registro nativo. Esto verifica las combinaciones utilizadas por el catálogo; no significa que se haya ejecutado una tarea sustantiva con cada uno de los veinte especialistas.
2. La creación y vinculación reales ya se observaron en el chat nuevo. El registro de evidencia y cierre del programa auxiliar también se ejecutó. Esto no demuestra por sí solo la ejecución nativa de cada uno de los siete eventos: las pruebas controladas se distinguen de los eventos realmente observados.
3. [El material científico ficticio preparado](../plugins/agent-forge-research/tests/fixtures/scientific-review.md) no se ha usado para evaluar respuestas científicas de los especialistas. Los acuses breves verifican recepción y configuración, no calidad científica. No se presenta como aprobada una evaluación científica integral.

No hace falta recopilar un corpus, iniciar estudios, instalar nuevas skills o contratar servicios para esas comprobaciones pendientes. Las capacidades opcionales de Pandoc/XeLaTeX no se presentan como compilación verificada; para documentos LaTeX independientes se conserva el editor nativo.

La documentación nativa limita `Interrupt` y `SessionEnd` al chat principal. Interrumpir un subagente no prueba esos eventos. No se archivó ni eliminó el chat de Roberto, ni se cerró la aplicación para forzar su ejecución. Su comportamiento en las pruebas controladas se distingue de esos eventos reales todavía no observados.

## Uso y recuperación

El procedimiento operativo y los comandos de instalación/retirada están en [la documentación del plugin](research-desktop-plugin.md). La skill de entrada es `agent-forge-research:direct-research`. La dirección conserva las decisiones científicas no delegadas y utiliza únicamente especialistas pertinentes al encargo. No se modificó el modelo global para imponer el modelo de la dirección.

Los servicios externos permanecen permitidos dentro de la autorización suficiente de Roberto. La revisión de confianza de los hooks no concede autorización para gastos, datos, destinos, publicaciones o acciones físicas ajenas al encargo.
