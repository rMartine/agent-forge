# Instalación del equipo de investigación en esta workstation

Estado: **plugin implementado, instalado y reconocido por el cliente nativo; siete hooks confiables. La aceptación integral sigue pendiente de comprobar la vinculación entre asignaciones y especialistas en ejecución real**.

Se instaló `agent-forge-research@agent-forge-research-local`, versión `1.0.2`, mediante los comandos nativos de Codex. No se desplegó a otra workstation ni se publicaron cambios remotos. El paquete incluye veinte definiciones de especialistas, una dirección, veintiuna skills y siete hooks. Las responsabilidades y los modelos corresponden al [catálogo implementado](../plugins/agent-forge-research/research-roster.json).

## Ubicaciones comprobadas

| Componente | Ubicación |
|---|---|
| Catálogo local y versión preparada | `D:/Proyectos/Agent Forge/installed-research-plugin/1.0.2` |
| Plugin instalado por Codex | `C:/Users/rober/.codex/plugins/cache/agent-forge-research-local/agent-forge-research/1.0.2` |
| Entorno científico Python 3.12 | `D:/Proyectos/Agent Forge/research-runtime/python312` |
| Ubicación configurada para registros | `C:/Users/rober/AppData/Local/AgentForge/research-plugin-data` |
| Materiales y observaciones locales de validación | `D:/Proyectos/Agent Forge/research-plugin-validation` |

El inventario del paquete instalado contiene 247 archivos y coincide con el preparado. Su SHA-256 agregado es `8e91889f71b1830ee0ea5e0bbb742c17bef589d9f52a06a359962543228c3e1d`. Las versiones preparadas anteriores se conservan para recuperación. Los hashes son comprobaciones de integridad, no firmas ni garantías absolutas contra modificaciones por quien controla la workstation. La versión `1.0.2` corrige únicamente una frase obsoleta del procedimiento de ejecución y el número de versión; conserva los programas probados en `1.0.1`.

## Resultados ejecutados

La siguiente lista contiene las comprobaciones realizadas para esta entrega y sus límites:

- **77 pruebas específicas aprobadas en la versión 1.0.1:** 43 de Node y 34 de Python, mediante `npm run test:research -- --python <intérprete de validación>`. Abarcan asignación/modelos declarados, correlación de subagentes con eventos controlados, cierre sin ciclos, separación entre proyectos, autorización, credenciales, rutas, solicitudes concurrentes, modelos externos, redirecciones, escrituras, inclusiones LaTeX y programas científicos representativos. La versión anterior tenía 74 pruebas aprobadas.
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

La observación final `native-client-version-1.0.2.json` confirma la carga de las 21 skills y los siete hooks confiables con las rutas de `1.0.2`; el verificador confirmó también los 247 archivos instalados. No fue necesaria otra aceptación de confianza.

La [documentación de OpenAI](https://developers.openai.com/plugins/build/plugins) establece que instalar un plugin no concede confianza a sus hooks. El usuario debe revisar la definición vigente en el control de hooks del cliente. No se editaron registros de confianza ni se utilizó la opción de omitir esa revisión.

La primera dirección de prueba fue un subagente real, `01a0ff61-94d4-7213-86f0-ab5006670f2b`. Su `turn_context` confirmó `gpt-6-astra/high`. El chat principal de implementación conservó `gpt-6-astra/xhigh`; no se cambió su modelo ni la configuración global. La dirección creó un especialista de revisión, pero dos consultas mantuvieron su asignación en `prepared`, sin identidad vinculada ni modelo observado por el plugin. Se interrumpió ese especialista, se registró la limitación y se cerró la sesión. No se aceptaron resultados científicos ni se ejecutaron las otras tres combinaciones bajo la misma causa.

La versión `1.0.1` corrige el tratamiento de la terminal nativa `Bash` con `tool_input.command`, conservando las formas anteriores `exec_command` con `cmd`. También reconoce `collaborationspawn_agent`, nombre observado en el registro de despacho del cliente. Una prueba controlada cubre su secuencia completa de validación y vinculación. El registro de despacho no demuestra qué recibió un hook; no se atribuye la falta de vinculación exclusivamente a ese nombre. Los analizadores de comandos, las restricciones de solo lectura y las comprobaciones de autorización e integridad permanecen vigentes.

La repetición con `1.0.1` mantuvo la asignación `prepared` sin identidad vinculada. Una prueba adicional desde el chat principal, con el especialista de referencias y argumentos explícitos `gpt-6.1-sol/medium`, tuvo el mismo resultado. Se interrumpieron ambas asignaciones y se registraron sus limitaciones mediante el programa de sesiones, sin modificar registros manualmente ni simular eventos. Por tanto, la corrección de compatibilidad no resolvió la falta de vinculación real. Su causa continúa sin determinarse. La evidencia de la prueba principal está en `desktop-acceptance/main-director-evidence.json`; la de la dirección como subagente, en `desktop-acceptance/01a0ff61-94d4-7213-86f0-ab5006670f2b/version-1.0.1/acceptance-report.md`, dentro de la carpeta de validación.

En la comprobación posterior a la actualización se conservaron el modelo global, el razonamiento global y todas las entradas previas de plugins. La comparación con el inventario anterior a la instalación encontró 31 archivos de agentes o skills de desarrollo con hashes diferentes. La prueba previa de retirada y reinstalación de `1.0.0` había confirmado los 197 archivos sin diferencias. No se atribuyen estas diferencias posteriores a la actualización científica ni se restauran archivos ajenos: los comandos de este cambio se limitaron al plugin de investigación y su catálogo. `preservation-version-1.0.1.json` conserva la comparación, sin presentar como vigente una coincidencia de hashes que ya no existe.

Falta completar la siguiente aceptación del plan:

1. Observar en Desktop la creación y vinculación de especialistas con las cuatro combinaciones acordadas: `gpt-6-astra/high`, `gpt-6-astra/medium`, `gpt-6.1-sol/high` y `gpt-6.1-sol/medium`. La selección explícita en argumentos tiene pruebas; el modelo de la dirección ya se comprobó en su registro nativo. Aún no se acredita la ejecución completa de las cuatro combinaciones.
2. Observar eventos reales de creación, uso de herramientas, cierre e interrupción, junto con su correspondencia con los registros. Los eventos sintéticos usados por las pruebas no sustituyen esta comprobación.
3. Ejecutar los casos científicos de aceptación con [el material controlado preparado](../plugins/agent-forge-research/tests/fixtures/scientific-review.md): síntesis trazable, cita que no respalda la afirmación, cálculo conocido, supuesto omitido, error de simulación, filtración entre entrenamiento y evaluación y separación entre resultados simulados, físicos y humanos. Crear el material no equivale a haber evaluado las respuestas de los especialistas.

No hace falta recopilar un corpus, iniciar estudios, instalar nuevas skills o contratar servicios para esas comprobaciones pendientes. Las capacidades opcionales de Pandoc/XeLaTeX no se presentan como compilación verificada; para documentos LaTeX independientes se conserva el editor nativo.

La documentación nativa limita `Interrupt` y `SessionEnd` al chat principal. Interrumpir un subagente no prueba esos eventos. No se archivó ni eliminó el chat de Roberto, ni se cerró la aplicación para forzar su ejecución. Su comportamiento en las pruebas controladas se distingue de esos eventos reales todavía no observados.

## Uso y recuperación

El procedimiento operativo y los comandos de instalación/retirada están en [la documentación del plugin](research-desktop-plugin.md). La skill de entrada es `agent-forge-research:direct-research`. La dirección conserva las decisiones científicas no delegadas y utiliza únicamente especialistas pertinentes al encargo. No se modificó el modelo global para imponer el modelo de la dirección.

Los servicios externos permanecen permitidos dentro de la autorización suficiente de Roberto. La revisión de confianza de los hooks no concede autorización para gastos, datos, destinos, publicaciones o acciones físicas ajenas al encargo.
