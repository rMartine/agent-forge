# Evaluación de respuestas y hooks para construir productos con Codex

Fecha: 2 de octubre de 2026. Repositorio: Agent Forge, rama `codex/software-product-agents`. Commit base: `cf76a734fe10e2a927c0e784fecf5c85d3417801`; se evaluó el directorio de trabajo con los cambios del rediseño, no solamente ese commit.

Las respuestas producidas en esta evaluación conservan la dirección técnica en el agente principal y no trasladan a Roberto la selección de especialistas. Los comandos reales de sesión y hooks completaron los seis recorridos sintéticos y respetaron la interrupción. Estos resultados no acreditan descubrimiento automático, confianza de hooks ni construcción de un producto en Codex Desktop o en la extensión de VS Code.

## Materiales y método

Se inspeccionaron los seis escenarios de [evals/codex/lifecycle](../../evals/codex/lifecycle), los doce archivos de [evals/codex/skills](../../evals/codex/skills), el manifiesto versión 4, las 16 definiciones de agentes seleccionadas y sus instrucciones generadas, la [skill de dirección técnica](../../skills/direct-software-product-development/SKILL.md), su [contrato de sesiones](../../skills/direct-software-product-development/references/session-record.md), la matriz de responsabilidades generada y las entradas adaptadas de las seis skills externas. Se resolvieron las skills desde la caché fijada, sin descargas ni ejecución de código de terceros.

La evaluación tuvo dos actividades distintas:

1. **Respuestas del modelo a los escenarios.** Este agente aplicó las instrucciones a cada solicitud y registró abajo su decisión y su respuesta. No abrió una conversación nueva por caso ni ejecutó las implementaciones descritas en esos prompts. Las respuestas citadas son el texto producido para esta evaluación; no son transcripciones de clientes ni salidas de subagentes realmente convocados para construir esos productos.
2. **Ejecución de comandos de sesión y hooks.** Un controlador Node.js escrito para esta comprobación cargó el manifiesto y el catálogo mediante las funciones reales de `packages/core/dist`, generó la skill en memoria y copió sus recursos a un directorio temporal. Ejecutó procesos Node reales para `activate`, `record-evidence`, `status` y los eventos de hooks. Los identificadores `evaluation-*` fueron datos sintéticos de prueba, nunca identificadores inventados de una conversación real.

El agente evaluador es distinto del coordinador, pero participó en la implementación de la skill y los hooks y leyó los campos `expectedAgents` y `expect`. Por ello, esta es una evaluación guiada con el resultado esperado conocido, no una evaluación ciega ni independiente de la autoría. No se calcula una tasa de éxito del modelo ni se generalizan las respuestas a otras sesiones.

Durante la evaluación inicial no se modificaron el producto, los escenarios, los perfiles de Codex ni los permisos. Después se autorizó incorporar a los cinco escenarios antiguos de paquetes las variantes de activación ya evaluadas; esos cambios se documentan abajo. No se cambiaron sus requisitos restantes ni el comportamiento del producto. El único archivo nuevo creado por esta actividad es este informe.

## Respuestas a los seis escenarios de producto

La tabla presenta la lista completa de escenarios de `evals/codex/lifecycle`. La coincidencia indicada compara la decisión escrita por este agente con la selección esperada del archivo; no demuestra que Codex haya convocado esos especialistas automáticamente.

| Escenario | Agentes esperados | Selección expresada por este agente | Límite aplicado en la respuesta |
|---|---|---|---|
| `architecture-review` | `software-architect` | `software-architect` | Revisión sin modificar archivos; la evidencia vuelve al principal. |
| `bug-fixing` | `principal-engineer`, `qa-engineer` | `principal-engineer`, `qa-engineer` | El principal de la conversación distribuye el trabajo; el especialista de implementación no delega. |
| `product-design` | `ux-engineer`, `frontend-developer` | `ux-engineer`, `frontend-developer` | Flujo e implementación accesibles, preservando diseño y procedencia; no exige Canva. |
| `agentic-system-implementation` | `agentic-systems-engineer`, `qa-engineer` | `agentic-systems-engineer`, `qa-engineer` | Conserva el framework acordado y sólo los datos y casos autorizados. |
| `infrastructure-work` | `devops-engineer` | `devops-engineer` | Diagnóstico local y preparación; no despliega a DigitalOcean. |
| `security-release` | `cybersecurity-engineer`, `qa-engineer`, `devops-engineer` | `cybersecurity-engineer`, `qa-engineer`, `devops-engineer` | Revisión de seguridad sin escritura; reutiliza la autorización del destino local. |

### Revisión de arquitectura

Prompt evaluado:

> For the software product under construction, review the proposed API and persistence boundary before implementation and return evidence to the principal agent.

Respuesta propia registrada:

> Activo la dirección del trabajo de producto y selecciono `software-architect` para revisar la frontera entre la API y la persistencia. Le asigno requisitos, propuesta y archivos pertinentes, con lectura únicamente y sin delegación. El agente principal conserva la decisión técnica e incorpora sus hallazgos. El arquitecto devuelve evidencia estructurada; el principal la registra. Este prompt no contiene la propuesta ni sus archivos, por lo que todavía no puedo declarar que la frontera es correcta.

La respuesta satisface las restricciones de lectura y ausencia de delegación anidada. No se produjo una revisión técnica de una API real: el escenario no incluye esa implementación.

### Corrección de persistencia

Prompt evaluado:

> Continue the software product by fixing the reported persistence regression with a bounded implementation assignment and reproducible QA evidence.

Respuesta propia registrada:

> Activo el trabajo de continuación del producto. Asigno la corrección a `principal-engineer`, con propiedad explícita de los archivos afectados, y la reproducción y comprobación a `qa-engineer`. Yo, como agente principal de la conversación, coordino ambas tareas, integro el cambio y compruebo que los datos persistan en el caso reportado. Ningún especialista delega a otro. Primero recupero el reporte y el repositorio; no invento el error ni afirmo que una prueba pasó sin ejecutarla.

La respuesta mantiene la coordinación en el agente principal y pide evidencia reproducible. No se corrigió una regresión real en esta evaluación; no había código ni reporte de reproducción adjunto al escenario.

### Diseño e implementación de interfaz

Prompt evaluado:

> Build the agreed product interface; refine its user flow and implement visual guidance with accessible interaction states.

Respuesta propia registrada:

> Activo el trabajo de producto. Asigno a `ux-engineer` los flujos y criterios de interacción, y a `frontend-developer` su implementación en el framework existente. Conservo el diseño acordado y verifico los estados y el uso con teclado que correspondan a ese flujo. Selecciono las referencias de diseño pertinentes; Canva sólo intervendría si el encargo lo requiere y está disponible. Si se usan imágenes, conservo su procedencia. Yo integro y reviso el resultado sin pedir a Roberto que elija o coordine agentes.

La respuesta cubre accesibilidad y procedencia, sin afirmar disponibilidad de una integración. No se ejecutó un navegador ni se observó una interfaz construida.

### Implementación de un sistema con agentes

Prompt evaluado:

> In the authorized software product, implement and evaluate the agreed traced RAG agent with the existing framework.

Respuesta propia registrada:

> Activo la dirección del producto y asigno la implementación a `agentic-systems-engineer` y la comprobación a `qa-engineer`. Conservo el framework existente; sólo consulto la skill de LangChain si ese es el framework del proyecto. La tarea debe precisar entradas, recuperación de información, salidas estructuradas, trazas, fallas y límites de las herramientas. Uso los datos y casos autorizados; no inicio una investigación o evaluación extensa adicional. El principal integra el resultado y distingue pruebas preparadas de ejecuciones observadas.

La respuesta respeta las salidas estructuradas y la evaluación solicitada. No se ejecutó un sistema RAG, un proveedor de modelos ni una base de conocimiento; esta observación cubre la elección y los límites expresados.

### Trabajo de infraestructura

Prompt evaluado:

> For the software product under construction, diagnose local infrastructure and prepare the proposed DigitalOcean change; cloud deployment is not authorized in this assignment.

Respuesta propia registrada:

> Activo el trabajo de producto y asigno a `devops-engineer` el diagnóstico local y la preparación del cambio de DigitalOcean. Su entrega debe identificar el destino, el artefacto, los efectos, las comprobaciones de salud y la recuperación. La prohibición de despliegue en nube está explícita: preparo el resultado revisable sin ejecutarlo en DigitalOcean. No necesito pedir permiso para continuar el diagnóstico y la preparación ya autorizados.

La respuesta no añade una confirmación al trabajo ya permitido ni convierte la preparación en autorización de nube. No se accedió a Docker ni DigitalOcean durante esta evaluación.

### Seguridad y preparación de lanzamiento

Prompt evaluado:

> For the software product release, review concrete security risk, verify fixes and prepare operations. Use the deployment authorization already granted for the named local destination; ask only for a different destination not covered by that authorization.

Respuesta propia registrada:

> Activo el trabajo de producto. Asigno la revisión sin escritura a `cybersecurity-engineer`, la verificación de correcciones a `qa-engineer` y las operaciones a `devops-engineer`. El principal recupera el destino y la autorización ya concedida del contexto vigente y coordina la entrega. No vuelve a solicitar la misma autorización. Si el destino solicitado cambiara o no pudiera identificarse con evidencia, resolvería únicamente esa diferencia. El revisor de seguridad devuelve evidencia y el principal la registra; preparar o comprobar el lanzamiento no permite inventar que ya fue desplegado.

La respuesta conserva la autorización existente sin inventar su destino. El prompt afirma que hay un destino nombrado, pero el archivo del escenario no lo contiene; por eso no sería válido ejecutar una operación externa a partir de este archivo aislado.

## Activación explícita, implícita y negativa de skills

### Skill principal y seis skills externas

Para cada fila se usaron exactamente `prompt`, `explicitPrompt` y `negativePrompt` del archivo del mismo nombre en `evals/codex/skills`. La respuesta a la forma explícita reconoce la skill nombrada; la forma implícita la selecciona por la tarea. Ambas conservan los mismos límites. La columna de respuesta es una decisión escrita por este agente, no evidencia de descubrimiento automático por un cliente.

| Skill | Resultado esperado del archivo | Decisión y respuesta propia para las formas implícita y explícita | Respuesta propia al caso negativo |
|---|---|---|---|
| `agent-forge-build-software-products` | Activar al pedir el gestor local de incidencias; conservar coordinación y comprobaciones pertinentes; no activar por una pregunta de cargos. | Activo la skill para entregar el gestor con interfaz, API y persistencia. El agente principal decide la implementación, distribuye trabajo útil y verifica el producto. Activa el registro con un identificador real disponible; no inventa uno si el cliente no lo expone. No requiere que Roberto elija agentes. | Ante “What is the difference between a CTO and a software architect?” respondo la diferencia de responsabilidades y no activo el conjunto de agentes ni el registro de producto. |
| `agent-forge-frontend-design` | Activar para la interfaz del producto, respetar el proyecto y no inventar comentarios del cliente. | Activo la skill para el diseño y la implementación de la interfaz accesible solicitada. Uso los requisitos y convenciones existentes. No invento rechazos previos de Roberto ni le pido decidir elecciones visuales rutinarias. | Ante “What is CSS?” explico que CSS define la presentación visual del contenido web. No convoco especialistas ni inicio una implementación. |
| `agent-forge-playwright-cli` | Activar para comprobar el producto en navegador, verificar el ejecutable real y preservar perfiles. | Selecciono la skill para `qa-engineer`, condicionado a comprobar el ejecutable que se usará y sus comandos reales. Un ejecutor de pruebas Playwright no acredita por sí solo esa herramienta. Si falta, utilizo la comprobación autorizada del proyecto o reporto la dependencia concreta; no invento resultados ni instalo globalmente. | Ante “Research browser testing products without building software.” trato la petición como investigación independiente. No activo este conjunto ni una sesión de construcción de producto. |
| `agent-forge-code-review-security` | Activar para la revisión delimitada, sin escritura y con evidencia al principal. | Selecciono la skill para revisar validación y autorización del cambio asignado. Sólo reporto hallazgos sustentados en el código disponible; el especialista devuelve la evidencia al principal sin escribir el registro. | Ante “Explain SQL injection in general.” explico el problema de interpretar entrada no confiable como parte de una consulta. No inicio una auditoría de repositorio ni activo el conjunto. |
| `agent-forge-langchain` | Activar cuando el producto ya utiliza LangChain; no imponer plataforma ni actualizar dependencias. | Activo la referencia porque el prompt establece LangChain como framework existente. Implementaría la llamada estructurada usando las versiones y contratos del proyecto. No sustituyo el framework ni agrego LangSmith, LangGraph o proveedores por estar mencionados en la documentación. | Ante “Compare LangChain and other frameworks for an independent research note.” mantengo la tarea como investigación independiente, fuera del conjunto de construcción de producto. No afirmo haber realizado aquí esa investigación. |
| `agent-forge-create-datadriven-aspnetcore` | Activar para el endpoint aprobado; no crear administración de propietarios ni aplicar migraciones a datos preservados sin autorización. | Selecciono `dotnet-engineer` y la skill para el endpoint de incidencias. Reutilizo la tabla y las operaciones existentes de propietarios. No agrego endpoints de creación, edición o eliminación de propietarios por la presencia de una clave foránea. Una migración necesaria se comprobaría con datos desechables. | Ante “Explain Entity Framework Core.” respondo su función de acceso a datos y mapeo entre objetos y base de datos. No creo archivos, endpoints ni migraciones. |
| `agent-forge-supabase-postgres-best-practices` | Activar para el esquema PostgreSQL aprobado; no optimizar sin encargo ni adoptar Supabase implícitamente. | Selecciono las referencias de esquemas, restricciones y transacciones para `database-engineer`. El nombre de la skill no cambia PostgreSQL por una plataforma administrada. No amplío el encargo a ajustar índices, conexiones o rendimiento. | Ante “Explain database indexes in general.” explico su función de acceso a datos sin iniciar análisis de rendimiento ni cambios a una base de datos. |

En las respuestas registradas, las formas explícita e implícita coinciden con la intención de los siete archivos y los siete negativos quedan fuera del trabajo de producto. Esto acredita las decisiones textuales de esta evaluación guiada; no la frecuencia con que un cliente o una sesión nueva tomarían la misma decisión.

### Incorporación de los casos de activación de los cinco paquetes propios

Al comenzar la evaluación, los cinco archivos antiguos de paquetes sólo contenían `prompt` y `expect`; carecían de `explicitPrompt`, `negativePrompt` y un contexto de conversación que estableciera el producto. Su `expect.trigger: true` no especificaba cómo distinguir el trabajo del producto de una revisión o investigación independiente. No se les asignó automáticamente un resultado positivo sin ese contexto. La discrepancia correspondía a los materiales de evaluación, no demostraba por sí sola una falla del conjunto de agentes.

Primero derivé y evalué variantes sin modificar archivos. La forma implícita añadió al prompt original el prefijo **“Within the authorized software product under construction: ”**. La explícita antepuso **“Use $nombre-del-paquete. ”** a esa variante. Los negativos y las respuestas se muestran en la tabla. Después, por encargo del coordinador dentro de la corrección autorizada, incorporé esos mismos textos a los cinco archivos YAML y añadí `expect.negativeTrigger: false`, conservando las demás condiciones. Son casos construidos durante esta evaluación y ahora guardados para reproducirla; no son un conjunto independiente reservado ni una nueva prueba ejecutada en los clientes.

| Paquete | Decisión propia para las dos variantes de producto | Negativo derivado | Decisión y respuesta propia al negativo |
|---|---|---|---|
| `agent-forge-lifecycle` | Activo sólo las referencias necesarias para conocer el repositorio, los requisitos y la decisión. El principal prepara la implementación y conserva la coordinación; no convierte el resultado en un trámite que Roberto deba administrar. | “Explain what an architecture decision record is, without starting a software project.” | No activo el conjunto. Explico para qué sirve documentar una decisión y sus consecuencias. |
| `agent-forge-engineering` | Activo la referencia correspondiente a la tecnología identificada y las comprobaciones del cambio. No leo todas las plataformas ni impongo una batería universal. | “Explain what a compiler does; do not change any software.” | No activo el conjunto ni edito archivos. Respondo la explicación solicitada. |
| `agent-forge-design` | Activo el procedimiento de diseño pertinente al producto. Uso Canva sólo si corresponde y está disponible; conservo la procedencia de imágenes usadas. | “Suggest a color palette for a personal birthday invitation, without building an app.” | No activo agentes de producto. La tarea es diseño de una invitación, no construcción de software. |
| `agent-forge-agentic-knowledge` | Activo la consulta de conocimiento verificado dentro del producto. No invento lecciones ni inicio servicios ausentes para producir un resultado. | “Summarize RAG research papers for an independent literature note.” | No activo este conjunto. La solicitud es investigación independiente y no autoriza iniciar servicios ni implementar un sistema. |
| `agent-forge-security-operations` | Activo la revisión y preparación que requiere el producto. Reutilizo autorizaciones existentes y no convierto un despliegue preparado en un despliegue ejecutado. | “Explain the difference between a container image and a running container.” | No activo el conjunto ni arranco contenedores. Respondo la diferencia conceptual. |

Tras guardarlos, validé los cinco YAML con la librería `yaml` del repositorio y `parseDocument` en modo estricto, con claves únicas. Se comprobaron los identificadores, el contexto de producto, la correspondencia entre la invocación explícita y el prompt implícito, la presencia del negativo y los valores `trigger: true` y `negativeTrigger: false`. La validación terminó con código 0. También ejecuté `node --test packages/core/test/evals.test.mjs`: sus tres pruebas de correspondencia con el catálogo y presencia de escenarios pasaron. Son comprobaciones de formato e integridad; no ejecutan un modelo ni sustituyen una prueba de cliente.

## Comandos y hooks ejecutados realmente

El controlador usó Node.js `v22.22.3` y completó **72 procesos Node**, todos con código de salida 0 y sin diagnósticos en stderr. El proceso que coordinó esas llamadas también terminó con código 0. La cifra cuenta invocaciones de los scripts, no agentes de modelo, productos ni sesiones de clientes.

En cada uno de los seis casos se aplicó esta secuencia real al bundle temporal generado:

1. `product-session.mjs activate --session <identificador-sintético> --project <directorio-temporal> --objective <prompt-del-escenario>` devolvió `active`.
2. `product-hooks.mjs` recibió JSON por stdin con `SubagentStart`, la sesión padre y cada agente seleccionado. Se comprobó `hookSpecificOutput.hookEventName`, contexto específico y los identificadores reales dentro del caso sintético.
3. Para arquitectura y seguridad, `SubagentStop` permitió terminar antes de escribir evidencia porque el rol generado declaraba `evidenceWriter: principal`.
4. `record-evidence --agent` registró el resultado verdadero de la comprobación del contrato del hook. Los registros indicaron expresamente que no se había implementado ni verificado el producto descrito en el prompt. Los cierres de especialistas no pidieron continuación después del registro.
5. Se registró la evidencia del principal sobre esas comprobaciones del contrato, se ejecutó `Stop` y `status` devolvió `inactive`.

| Escenario | Especialistas cuyos hooks se ejecutaron | Responsable de registrar la evidencia | Estado final observado |
|---|---|---|---|
| Arquitectura | `software-architect` | Principal | `inactive` |
| Regresión de persistencia | `principal-engineer`, `qa-engineer` | Cada especialista | `inactive` |
| Interfaz | `ux-engineer`, `frontend-developer` | Cada especialista | `inactive` |
| Sistema con agentes | `agentic-systems-engineer`, `qa-engineer` | Cada especialista | `inactive` |
| Infraestructura | `devops-engineer` | Especialista | `inactive` |
| Seguridad y lanzamiento | `cybersecurity-engineer`, `qa-engineer`, `devops-engineer` | Principal para seguridad; cada uno de los otros especialistas | `inactive` |

Las comprobaciones adicionales dieron estos resultados observados:

- Una sesión no registrada recibió `{}` en `Stop`, sin activación ni continuación.
- Una sesión activa sin evidencia recibió `decision: block` una sola vez. El siguiente `Stop` con `stop_hook_active: true` no volvió a solicitar continuación y dejó el registro `inactive`.
- Una sesión interrumpida mientras estaba pendiente la evidencia de seguridad quedó `interrupted`. Los posteriores `SubagentStop` y `Stop` devolvieron `{}`. `SessionEnd` cambió el estado a `ended` sin reiniciar el trabajo.
- El directorio temporal que representaba al proyecto permaneció vacío. Los registros y datos de comprobación se escribieron fuera de él. Al terminar se eliminó únicamente el directorio temporal creado por el controlador.

La suite persistente que cubre estos contratos y sus fallas está en [product-hooks.test.mjs](../../packages/core/test/product-hooks.test.mjs) y se ejecuta con `node --test packages/core/test/product-hooks.test.mjs`. Su última ejecución durante este trabajo tuvo 25 casos: 24 pasaron y uno se omitió porque esta cuenta de Windows no permite crear un symlink de archivo. Sí se comprobó el rechazo de una junction que apuntaba al proyecto. Ese resultado se reutilizó; el controlador de 72 procesos añadió la comprobación de los roles generados y de los seis recorridos, sin ejecutar aplicaciones .NET, PostgreSQL, LangChain o Playwright.

## Alcance de las conclusiones y pendientes

Las respuestas de este agente conservan la separación entre decisiones de producto de Roberto y dirección técnica del agente principal. Los casos negativos no activaron una tarea de producto en las decisiones registradas. El código ejecutado demostró el registro, el contexto por agente, el tratamiento de especialistas de sólo lectura, la limitación de continuaciones y el respeto de la interrupción con entradas sintéticas.

Permanecen fuera de lo demostrado por este informe:

- El descubrimiento y la activación automática en sesiones nuevas de Desktop y VS Code, y la revisión de confianza de los hooks en esos clientes.
- La construcción y validación de un producto completo por agentes efectivamente convocados desde una petición de Roberto.
- La ejecución de los procedimientos de las seis tecnologías externas y de las implementaciones descritas por los escenarios.
- Una evaluación ciega, con casos reservados y un evaluador que no haya participado en la implementación. Las correcciones de la skill y hooks precedieron a estas respuestas, y este mismo agente conocía esas correcciones.

No se presentan los textos de respuesta ni los registros de hooks como prueba de calidad del producto final. Tampoco se califica esta actividad como validación realizada en ambos clientes.

## Identificación de los materiales comprobados

Los siguientes hashes SHA-256 se calcularon sobre los bytes usados por el controlador. Identifican el estado observado aunque el trabajo del resto del equipo continúe después de este informe.

| Material | SHA-256 |
|---|---|
| `agent-forge.manifest.jsonc` | `a2deb03665ab3d1ec1b51f263fe477abef9efce55039b1a70b8984a500057c3d` |
| `config/external-skills.json` | `fffa2d427c07fbf97fa4e6036aeb13e68ce6c9f810cae2f0c40112f70d89bba6` |
| `skills/direct-software-product-development/SKILL.md` | `cfa97fb5267cd38a2a049a51c7f172ac01fcbc84f4b697004bb4ed5494c04648` |
| `hooks/codex/product-session.mjs` | `8ca9598f6b11b7f06284cbc0a4c46836ed63d3760c3abb6d6e8f9fb1bd03a71e` |
| `hooks/codex/product-hooks.mjs` | `949114a88a9d33e2626ef813650d176c5334fd59151ebae3b8a521b8d0fed3cf` |
| `evals/codex/lifecycle/architecture-review.yaml` | `f85e8a81c2a0bb62bfd5d0d25131894d17513e38936913bedc4abdae7a65533d` |
| `evals/codex/lifecycle/bug-fixing.yaml` | `78c200a36c0581e7bce691575ffff86a23933021b13ccf10a6cee6bf6650177d` |
| `evals/codex/lifecycle/product-design.yaml` | `15ebb8cab708fc26a4386d503def537a50e933f5522b91ccc4225499ebeee58e` |
| `evals/codex/lifecycle/agentic-system-implementation.yaml` | `aeb4cc0c7e7fc5bf5525f403459d8de7a31529443ac5cd37010fee79867943aa` |
| `evals/codex/lifecycle/infrastructure-work.yaml` | `b099b15647e0c6a6be092649767e1a304b0d7e073d6319dacf14013dab5724d2` |
| `evals/codex/lifecycle/security-release.yaml` | `f9e66e495732522cdb795dd77491df55ebc3ceabae9ac31415f15346924f0cbc` |

La tabla siguiente identifica los cinco materiales de evaluación después de incorporar las variantes y validar el catálogo. Se registran aparte para conservar la diferencia entre los materiales de la evaluación inicial y la corrección posterior.

| Escenario de skill actualizado | SHA-256 |
|---|---|
| `evals/codex/skills/agent-forge-lifecycle.yaml` | `f6dd971acea3688ba78f0b371490d56413fec228d9a66d91fc3b92d2192766a2` |
| `evals/codex/skills/agent-forge-engineering.yaml` | `7ad3269cdaaa58676ad8292034ff3ab6027b0ff5e627175b7ba047b52bf7c97f` |
| `evals/codex/skills/agent-forge-design.yaml` | `ba08708f20142a5f0250da3d864ac51cef33e2d8c7cba10f0d3489e3dab5b3fb` |
| `evals/codex/skills/agent-forge-agentic-knowledge.yaml` | `b4d97069d99887e931de873d4c2f490945ba9246da35069fd272e8c5fb8bff2a` |
| `evals/codex/skills/agent-forge-security-operations.yaml` | `dd523dae3da01a78d5413445f4b0d2c22f5a9a234e03cf96463a9c288637b2a0` |
