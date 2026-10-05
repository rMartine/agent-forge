# Consultor sénior de tecnología e IA para logística, aduanas y transporte

Módulo independiente de Agent Forge para Codex. El perfil `technology-ai-logistics-consultant` analiza problemas, diseña soluciones y produce propuestas, respuestas y presentaciones para la consultoría de Roberto. Trabaja internacionalmente según el cliente, conversa en español de México y redacta en el idioma indicado. Hereda modelo, razonamiento y permisos; no modifica los equipos de desarrollo, investigación o especialistas existentes.

## Usarlo

En una sesión nueva de Codex, pide por ejemplo: «Usa al consultor de tecnología e IA para preparar la propuesta de este cliente». La skill `consulting-specialist-coordination` asigna el trabajo y conserva el contexto cuando cliente y proyecto están identificados. La conversación principal integra los resultados. El consultor responde preguntas breves directamente y prepara archivos editables cuando se solicitan, utilizando las skills de documentos, presentaciones y hojas de cálculo disponibles.

Las seis adaptaciones de Management Consulting cubren análisis estratégico, procesos, modelos económicos, propuestas, planificación y entregables. Las dos skills propias cubren operaciones logísticas, aduaneras y de transporte, y diseño de soluciones tecnológicas y de IA. `sources.json` fija las fuentes y cambios; cada adaptación conserva su licencia. No se ejecutan instaladores ni programas del paquete externo. La selección depende del encargo; no se cargan todos los procedimientos de manera obligatoria.

## Instalar y revertir

Desde este directorio, con Node 22 o posterior. En Windows, Node debe estar disponible en PATH también para Codex; el comando de Windows evita la invocación de un ejecutable entre comillas que PowerShell interpreta como texto:

```text
node install.mjs preview
node install.mjs install --expected HUELLA_DE_LA_VISTA_PREVIA
node install.mjs verify
node install.mjs preview --operation rollback
node install.mjs rollback --expected HUELLA_DE_LA_VISTA_PREVIA
node install.mjs preview --operation uninstall
node install.mjs uninstall --expected HUELLA_DE_LA_VISTA_PREVIA
```

La instalación escribe exclusivamente el perfil propio en `CODEX_HOME/agents`, las skills `consulting-*` en `CODEX_HOME/skills`, su runtime en `CODEX_HOME/consulting-specialist` y sus grupos en `CODEX_HOME/hooks.json`. Por defecto CODEX_HOME es `~/.codex`. El registro y la copia recuperable de sus archivos quedan en `~/.agent-forge-consulting-specialist`. `--codex-home` y `--state-home` permiten perfiles temporales de verificación. La instalación rechaza destinos ajenos, modificaciones de archivos propios y vistas previas desactualizadas. Conserva los grupos de hooks ajenos; no altera `config.toml`, `AGENTS.md`, modelos, permisos, conectores o confianza.

El patrón de instalación procede del módulo de especialistas independientes, adaptado aquí para mantener propiedad y reversión separadas. No requiere actualizar ni reinstalar aquel módulo. Desinstalar o revertir retira exclusivamente archivos y grupos propios; conserva el contexto de clientes y los registros de sesiones. No se realizan eliminaciones recursivas.

Codex requiere revisión de confianza para hooks nuevos o modificados. Revísalos en sus controles nativos. Este módulo no concede confianza, edita sus hashes de aprobación ni omite la revisión. Archivos instalados, elementos descubiertos y hooks ejecutados son verificaciones distintas.

## Contexto por cliente y proyecto

El contexto persistente se guarda en `<proyecto>/.consulting/<cliente>/<proyecto-del-cliente>/` mediante cuatro documentos: `context.md`, `decisions.md`, `sources.md` y `deliverables.md`. El ayudante `context.mjs init --project RUTA --client IDENTIFICADOR --engagement IDENTIFICADOR` los crea sin sobrescribir los existentes. `locate` consulta la ruta sin escribir. La principal registra los identificadores ya conocidos con `assignment.mjs open`; no pide un formulario cuando puede obtenerlos del encargo. El consultor mantiene contenido, decisiones y referencias pertinentes mediante las herramientas de archivos.

Los documentos del cliente permanecen separados del código y no se incluyen en commits de implementación. No se copian a memoria global ni se transfieren a otro cliente. Para cambiar de cliente o proyecto se crea un agente nuevo: actualizar una etiqueta no elimina lo que una conversación anterior leyó. La separación de carpetas y asignaciones es organización de contexto, no una barrera de seguridad del sistema operativo.

## Hooks y registros

La siguiente tabla es el inventario completo de eventos registrados por este módulo:

| Evento | Función |
|---|---|
| `SubagentStart` | Vincula el perfil del consultor al encargo y aporta las rutas pertinentes de contexto y skills. |
| `PreToolUse` | Comprueba límites explícitos de herramientas concretas; rechaza contradicciones observables y advierte cuando no puede verificar un campo. |
| `PostToolUse` | Conserva únicamente identificadores, hora y estado observable; no copia argumentos, documentos, salidas completas o credenciales. |
| `SubagentStop` | Advierte sobre entregas sin constancia y resultados inconclusos. |
| `Stop` | Informa el estado y pendientes sin cerrar la asignación ni repetir avisos idénticos. |
| `Interrupt` | Marca las asignaciones interrumpidas; no las reanuda. |
| `SessionEnd` | Termina el contexto operativo; conserva el contexto persistente del cliente. |

Todos se limitan al perfil y a sus asignaciones reales. No hay listas universales de herramientas autorizadas, decisiones `allow`, continuaciones forzadas ni llamadas de red de los hooks. Los límites registrados referencian el encargo humano existente; no crean permisos. Las herramientas alojadas y ciertas rutas de ejecución pueden quedar fuera de interceptación. Las instrucciones y permisos nativos siguen vigentes. Los hooks no verifican semánticamente verdad, calidad, confidencialidad ni suficiencia de una propuesta.

`assignment.mjs` admite `open`, `status`, `record`, `close` y `resume` con `--session`, `--project` y, cuando corresponda, `--agent`. `open` y `record` leen JSON por stdin. La skill de coordinación documenta los campos. La ausencia de registro de un entregable no demuestra que falte en la conversación. Un error de hook devuelve JSON vacío y un diagnóstico sin reproducir datos; los comandos explícitos del ayudante devuelven error. Los archivos de estado tienen tamaño acotado, bloqueo exclusivo y reemplazo atómico; no se toman bloqueos que puedan pertenecer a otro proceso.

## Comprobar

```text
npm.cmd test
node verify-native.mjs RUTA_ABSOLUTA_CODEX_EXE RUTA_ABSOLUTA_PROYECTO
```

Las pruebas usan directorios temporales y comprueban contexto, asignaciones, restricciones observables, eventos y conservación al instalar y revertir. El segundo comando abre un proceso nativo nuevo para consultar el catálogo y hooks; no concede confianza ni inicia una tarea de consultoría. `--confirm-agent-catalog` permite una respuesta efímera sobre los roles nativos si los metadatos no los exponen, sin cambiar modelos ni generar materiales. La ejecución real de hooks y los ejercicios consultivos se informan por separado.

La procedencia de runtime y scripts nativos es el paquete de especialistas independientes de Agent Forge, commit `fee1628`. Las adaptaciones propias separan el contexto por cliente, heredan el modelo, evitan bloquear por falta de registro y limitan las denegaciones a contradicciones explícitas.

## Hooks: nombres, estado y recuperación

Los nombres visibles usan `Roster de {nombre} | {ámbito} | {evento} | {acción}` en statusMessage. Los cuatro nombres son Roster de Desarrollo, Roster de Investigación, Roster de Comunicación y Formación y Roster de Consultoría. El ámbito es el agente cuando el hook es exclusivo, Especialistas cuando es compartido y Sesión para Stop, Interrupt y SessionEnd. No se cambian identificadores técnicos ni se duplican hooks para mostrar etiquetas.

Las actualizaciones reemplazan cada grupo en su posición; no mueven los grupos ajenos. Cambiar una definición puede requerir renovar su confianza en Codex. El registro del instalador debe acompañar cualquier cambio de archivos administrados; no editar solamente la copia instalada.

La resolución usa la identidad registrada del agente y su proyecto. Los subdirectorios conservan las restricciones; cambiar a otro proyecto o a un repositorio anidado requiere registrar el encargo correspondiente. Un estado corrupto produce un diagnóstico sin datos del encargo y bloquea PreToolUse para el agente propio identificado. Un agente ajeno no queda bloqueado por ese error.

Los archivos .lock no se eliminan automáticamente por antigüedad. Para recuperar uno, con los encargos detenidos, ejecutar el helper hook-storage.mjs junto a los scripts con `recover-lock RUTA_ABSOLUTA.lock`. Solo si identifica un PID terminado devolverá sha256; aplicar con `recover-lock RUTA_ABSOLUTA.lock --apply --expected SHA256`. Conserva un recibo local. Un propietario activo o desconocido impide la recuperación: conservar el archivo y revisar offline el proceso y el registro antes de una intervención manual. No borrar bloqueos en lote.

En Comunicación y Consultoría, Stop conserva el estado de la asignación. SubagentStop marca returned; Interrupt marca interrupted. Reanudar exige el comando resume desde la conversación principal correspondiente; SubagentStart no reanuda una interrupción. El cierre explícito o SessionEnd termina el encargo. Consultoría mantiene las prohibiciones después del cierre.
