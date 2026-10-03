# Instalación del equipo de investigación en esta workstation

Estado: **plugin implementado, instalado y reconocido por el cliente nativo; aceptación integral en Desktop pendiente de confianza de hooks y ejecución de especialistas**.

Se instaló `agent-forge-research@agent-forge-research-local`, versión `1.0.0`, mediante los comandos nativos de Codex. No se desplegó a otra workstation ni se publicaron cambios remotos. El paquete incluye veinte definiciones de especialistas, una dirección, veintiuna skills y siete hooks. Las responsabilidades y los modelos corresponden al [catálogo implementado](../plugins/agent-forge-research/research-roster.json).

## Ubicaciones comprobadas

| Componente | Ubicación |
|---|---|
| Catálogo local y versión preparada | `D:/Proyectos/Agent Forge/installed-research-plugin/1.0.0` |
| Plugin instalado por Codex | `C:/Users/rober/.codex/plugins/cache/agent-forge-research-local/agent-forge-research/1.0.0` |
| Entorno científico Python 3.12 | `D:/Proyectos/Agent Forge/research-runtime/python312` |
| Ubicación configurada para registros | `C:/Users/rober/AppData/Local/AgentForge/research-plugin-data` |
| Materiales y observaciones locales de validación | `D:/Proyectos/Agent Forge/research-plugin-validation` |

El inventario del paquete instalado contiene 247 archivos y coincide con el preparado. Su SHA-256 agregado es `eaadbc25c6fb33efe4849c9e63c9b50eaa592d655dc6ac180440498b3bb7fa30`. Los hashes son comprobaciones de integridad, no firmas ni garantías absolutas contra modificaciones por quien controla la workstation.

## Resultados ejecutados

La siguiente lista contiene las comprobaciones realizadas para esta entrega y sus límites:

- **74 pruebas específicas aprobadas:** 40 de Node y 34 de Python, mediante `npm run test:research -- --python <intérprete de validación>`. Abarcan asignación/modelos declarados, correlación de subagentes con eventos controlados, cierre sin ciclos, separación entre proyectos, autorización, credenciales, rutas, solicitudes concurrentes, modelos externos, redirecciones, escrituras, inclusiones LaTeX y programas científicos representativos.
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

Los siete hooks están instalados y habilitados en el catálogo, pero el cliente devuelve **`trustStatus: untrusted`** para cada uno: `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt` y `SessionEnd`. Por tanto, no se afirma que se estén ejecutando sus controles en Desktop.

La [documentación de OpenAI](https://developers.openai.com/plugins/build/plugins) establece que instalar un plugin no concede confianza a sus hooks. El usuario debe revisar la definición vigente en el control de hooks del cliente. No se editaron registros de confianza ni se utilizó la opción de omitir esa revisión.

Después de esa revisión, falta completar la siguiente aceptación del plan:

1. Observar en Desktop la creación de especialistas con las cuatro combinaciones acordadas: `gpt-6-astra/high`, `gpt-6-astra/medium`, `gpt-6.1-sol/high` y `gpt-6.1-sol/medium`. La selección explícita en argumentos ya tiene pruebas; aún no se acredita aquí la ejecución nativa de esas cuatro combinaciones ni el modelo observado de la dirección.
2. Observar eventos reales de creación, uso de herramientas, cierre e interrupción, junto con su correspondencia con los registros. Los eventos sintéticos usados por las pruebas no sustituyen esta comprobación.
3. Ejecutar los casos científicos de aceptación con [el material controlado preparado](../plugins/agent-forge-research/tests/fixtures/scientific-review.md): síntesis trazable, cita que no respalda la afirmación, cálculo conocido, supuesto omitido, error de simulación, filtración entre entrenamiento y evaluación y separación entre resultados simulados, físicos y humanos. Crear el material no equivale a haber evaluado las respuestas de los especialistas.

No hace falta recopilar un corpus, iniciar estudios, instalar nuevas skills o contratar servicios para esas comprobaciones pendientes. Las capacidades opcionales de Pandoc/XeLaTeX no se presentan como compilación verificada; para documentos LaTeX independientes se conserva el editor nativo.

## Uso y recuperación

El procedimiento operativo y los comandos de instalación/retirada están en [la documentación del plugin](research-desktop-plugin.md). La skill de entrada es `agent-forge-research:direct-research`. La dirección conserva las decisiones científicas no delegadas y utiliza únicamente especialistas pertinentes al encargo. No se modificó el modelo global para imponer el modelo de la dirección.

Los servicios externos permanecen permitidos dentro de la autorización suficiente de Roberto. La revisión de confianza de los hooks no concede autorización para gastos, datos, destinos, publicaciones o acciones físicas ajenas al encargo.
