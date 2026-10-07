# Modelos de los especialistas y contexto de los hooks de Codex

El manifiesto de Agent Forge versión 5 configura un modelo y un esfuerzo de razonamiento para cada especialista de Codex. El agente principal de la conversación conserva el modelo elegido en su cliente y la responsabilidad de dirigir el producto. Los hooks observan el modelo comunicado por Codex; no lo seleccionan ni lo cambian.

La [documentación oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents), consultada el 2 de octubre de 2026, admite `model` y `model_reasoning_effort` en el archivo TOML del agente y establece que esos valores prevalecen sobre la configuración resuelta previamente. Definir ambos evita combinar un modelo nuevo con un esfuerzo heredado que no le corresponda. La disponibilidad sigue dependiendo del catálogo y del cliente utilizados.

## Asignación elegida y modificación posterior

Esta es la lista completa de las 16 asignaciones elegidas tras las 32 comparaciones sintéticas. La [evaluación](../audits/codex-model-comparison.md) explica los resultados y sus límites. La observación de los modelos en ambos clientes es una comprobación separada.

| Especialista | Modelo configurado | Esfuerzo de razonamiento |
|---|---|---|
| `software-architect` | `gpt-6.1-sol` | `high` |
| `principal-engineer` | `gpt-6.1-sol` | `high` |
| `backend-developer` | `gpt-6-luna` | `high` |
| `frontend-developer` | `gpt-6.1-sol` | `medium` |
| `database-engineer` | `gpt-6.1-sol` | `high` |
| `dotnet-engineer` | `gpt-6-luna` | `high` |
| `desktop-app-engineer` | `gpt-6.1-sol` | `high` |
| `mobile-engineer` | `gpt-6-luna` | `high` |
| `ml-engineer` | `gpt-6.1-sol` | `high` |
| `agentic-systems-engineer` | `gpt-6.1-sol` | `high` |
| `digital-twin-engineer` | `gpt-6.1-sol` | `high` |
| `ux-engineer` | `gpt-6.1-sol` | `medium` |
| `cybersecurity-engineer` | `gpt-6.1-sol` | `high` |
| `qa-engineer` | `gpt-6-luna` | `high` |
| `devops-engineer` | `gpt-6.1-sol` | `high` |
| `technical-writer` | `gpt-6-luna` | `high` |

La fuente de cada asignación es `codex.agents.<id>.model` y `modelReasoningEffort` en el [manifiesto](../../agent-forge.manifest.jsonc). Una revisión posterior modifica esos valores, regenera el plan y compara los archivos antes de desplegarlos. No hay una segunda tabla de política que deba sincronizarse. El campo legado `modelProfile: inherit` permanece legible por compatibilidad; no decide el modelo de Codex en la versión 5. Los perfiles de Copilot de `config/model-profiles.jsonc` y su resolución no cambian.

El lector y el esquema admiten manifiestos 3, 4 y 5. Las versiones 3 y 4 conservan la herencia de modelo y generan TOML sin los dos campos de modelo. Para usar asignaciones explícitas deben migrar a la versión 5, que exige ambos campos en todos los agentes Codex. Un identificador vacío, con espacios o un esfuerzo desconocido produce un error. La configuración opcional `codex.graphify`, con `managedRoot` y `lockFile`, también exige versión 5; `lockFile` debe ser una ruta dentro del repositorio.

`validateCodexModelAvailability` compara las asignaciones con `availableModels` y `availableReasoningEfforts` cuando esa información existe. Un modelo ausente o esfuerzo incompatible genera `AF011` con el agente afectado y la fuente del catálogo. No sustituye silenciosamente el modelo. La ausencia de catálogo no demuestra disponibilidad ni causa por sí sola un error. Una caché y el modelo observado en una ejecución son evidencias distintas.

## Contexto entregado por el agente principal

La orden existente `product-session.mjs activate` acepta ahora `--context-file <archivo JSON>` como opción. Se conservan `--session`, `--project` y `--objective`. El archivo es una entrada preparada por el agente principal y se lee una vez: el hook no recorre rutas del proyecto para deducir responsabilidades, tecnologías o versiones.

Estos son todos los campos opcionales del contexto de activación:

| Campo | Contenido y uso |
|---|---|
| `task` | Tarea del producto comunicada por el principal. |
| `scope` | Lista de límites del trabajo autorizado. |
| `ownership` | Lista de archivos o módulos asignados. |
| `stackVersion` | Objeto de tecnología a versión confirmada, por ejemplo `{"Express":"5.2.1"}`. |
| `context` | Información adicional necesaria para interpretar el encargo. |
| `assignments` | Objeto por tipo de agente con los mismos cinco campos anteriores. No se inventan asignaciones para tipos ausentes. |
| `graphify` | Observación proporcionada por el principal: `status`, y opcionalmente `metadata`, `reason`, `error`, `observedAt`. |

Repetir `activate` con el mismo objetivo y un nuevo archivo actualiza el contexto que recibirán las siguientes asignaciones; conserva los resultados ya registrados y la continuación consumida. Cambiar un objetivo activo sigue exigiendo terminar o desactivar el anterior. Cada `SubagentStart` nuevo guarda la asignación por tipo correspondiente a ese momento. Un evento duplicado del mismo agente y turno conserva la asignación y su evidencia. Una nueva asignación del mismo agente en otro turno recibe el contexto actualizado.

El contexto por tipo corresponde a las instancias de ese tipo que se inicien mientras esté vigente. Si el principal necesita repartir tareas distintas entre dos especialistas del mismo tipo, actualiza el contexto antes de iniciar cada uno y expresa la responsabilidad concreta también en su mensaje de delegación. El hook no puede reconstruir la tarea a partir del nombre de un agente.

La versión del registro temporal permanece en 1 y los campos nuevos son opcionales; los registros previos siguen siendo legibles. Se mantienen la asociación por sesión y proyecto canónico, los límites de tamaño, la escritura atómica, el bloqueo de concurrencia, la raíz temporal externa al proyecto y la validación de identificadores. Los valores de contexto informan el trabajo existente y no conceden permisos.

## Guías, modelo observado e índice de Graphify

`product-roles.json`, generado junto a los scripts, separa `skillNames` para los procedimientos propios y `conditionalSkills` para las guías externas. Cada guía conserva su `activationCondition` del catálogo, o la descripción en catálogos anteriores. `SubagentStart` presenta las condiciones junto con la tarea y las versiones suministradas. El especialista decide cuáles corresponden y consulta únicamente esas guías. El hook no hace una selección mediante coincidencias de palabras ni afirma conocer tecnologías que el principal no registró.

El registro del especialista puede contener `expectedModel`, `expectedReasoningEffort`, `observedModel` y `modelMismatch`. Los dos primeros provienen del manifiesto generado; el modelo observado proviene exclusivamente de `input.model` del evento. Si falta, permanece desconocido. Una diferencia genera un aviso en el contexto inicial y al terminar, sin bloquear por esa causa ni alterar ningún modelo. El identificador de modelo no demuestra qué esfuerzo ejecutó el cliente.

La observación Graphify acepta `missing`, `fresh`, `stale`, `invalid`, `unavailable` y `failed`. El objeto `metadata` transmite los campos de identidad, generación, rutas, hashes, fecha y cantidades de `status.json`; también admite `scopeHash`, `nodeCount` y `edgeCount`. `repositoryPath` debe coincidir con el proyecto canónico registrado. Las rutas se transportan como datos: el hook no abre el grafo, no ejecuta Python ni determina la frescura. Un estado observado como `fresh` puede haber quedado desactualizado después; el agente debe usar el comando administrado de estado o indexación antes de depender del resultado.

## Evidencia al terminar y límites de verificación

La evidencia existente mantiene estado, resumen, comprobaciones, resultados y limitaciones. Puede añadir `graphify: {status, referencesConsulted, error?}`. `status` admite `used`, `unavailable`, `failed` y `not-used`. Si es `used`, `referencesConsulted` debe contener al menos una ruta relativa al repositorio realmente consultada; puede añadir un localizador después de `#`. Las rutas absolutas y los segmentos de ascenso se rechazan. Si Graphify no intervino, puede omitirse todo el objeto. Un error del índice permite registrar el resultado real y continuar con la inspección directa pertinente.

Los hooks comprueban la estructura de ese registro, no que una referencia se haya leído ni que una conclusión sea correcta. Los especialistas de solo lectura siguen devolviendo su evidencia al agente principal, quien la registra. Falta de evidencia admite como máximo una continuación, `stop_hook_active` la impide y una interrupción no reinicia el trabajo. Los avisos de modelo o índice no cambian autorizaciones ni producen despliegues.

Las pruebas de `manifest`, `models`, `render`, `validation`, `codex` y `product-hooks` ejecutan lectura de versiones anteriores, generación TOML, validación de disponibilidad, transmisión del contexto, diferencias de modelo, evidencia Graphify, aislamiento, cancelación y concurrencia. Sus datos de Graphify y eventos de modelo son sintéticos: no prueban rendimiento del índice, superioridad de un modelo ni ejecución en Desktop o VS Code. Las observaciones en ambos clientes se registran por separado.
