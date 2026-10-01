# Propuestas de revisión de las instrucciones de trabajo en Agent Forge

**Informe para decisión de Roberto. 1 de octubre de 2026. Las propuestas no están aplicadas a las instrucciones del proyecto.**

La revisión recomienda conservar las reglas de procedencia, correspondencia de identificadores, protección de perfiles personales y conservación de trabajo ajeno. Recomienda precisar las restricciones sobre copias adicionales, las responsabilidades compartidas de las interfaces y la autorización de operaciones. Recomienda retirar la secuencia general de comprobaciones impuesta antes de cada commit y una repetición local incompleta de las obligaciones de Git. Las condiciones válidas de comprobación por cambio, integración y lanzamiento siguen sujetas a las instrucciones globales y al encargo vigente.

La intención actual de Roberto es disponer de capacidad de ingeniería en Codex dentro de VS Code y en Codex directo: Roberto define los objetivos y el asistente resuelve el trabajo técnico autorizado con la intervención humana mínima necesaria. La documentación anterior ayuda a comprender fuentes, contratos y consecuencias, pero no acredita por sí misma aprobación actual de cantidades, plataformas, funciones o decisiones del producto. Este informe revisa cómo se trabaja en el repositorio; no evalúa el conjunto de agentes que Agent Forge produce.

Las propuestas distinguen una decisión de desarrollo de una operación real sobre perfiles; una autorización suficiente de la entrada que exige una interfaz; y una condición de lanzamiento de una obligación automática por cada cambio. La mejora buscada es poder resolver las decisiones técnicas del encargo sin una secuencia obligatoria de actividades ajenas al cambio, sin congelar la distribución actual del código y sin trasladar a Roberto decisiones ya delegadas. No hay mediciones que permitan afirmar mejora de desempeño, calidad del código, costo o tiempo, ni se propone medirla en este encargo. No se añaden reglas permanentes de especialización, coordinación, autonomía, documentación o evaluación: las instrucciones globales ya regulan las responsabilidades y el alcance.

Los tres efectos conjuntos principales se aprecian en situaciones concretas:

- **1230 y los comandos generales.** Corregir una explicación no debe activar por el solo hecho de hacer un commit la compilación, todas las pruebas y la validación general. Eliminar 1230 y precisar 2215 y ambas ubicaciones de 2216 conserva cómo ejecutar esas actividades cuando correspondan y evita que otra fuente reinstaure la condición universal. Permanecen las comprobaciones documentales pertinentes y las obligaciones globales de Git.
- **1229 y las solicitudes repetidas de aprobación.** Si Roberto ya autorizó añadir un proveedor concreto al destino indicado, 2226 no debe obligar a pedir esa misma aprobación de nuevo. Reconciliar 1229 con 2220, 2222 y 2224 conserva autorización por efectos y destino. Si una interfaz requiere que Roberto introduzca un identificador, esa interacción se conserva: no se afirma que el asistente pueda automatizarla.
- **1225, convenciones e interfaces.** Si resolver un defecto de recuperación requiere coordinar una parte de esa operación con el ciclo de vida de la extensión, el asistente debe poder evaluar qué responsabilidad pertenece a la extensión y cuál debe continuar compartida. Cambiar juntas 1225, 2209 y 2232 evita que otra fuente exija colocar toda responsabilidad en packages/core. Sólo permite decisiones técnicas necesarias para el encargo; no inicia una reorganización ni cambia ahora el producto.

## Decisiones por número

La tabla es completa respecto de las **39 unidades enumeradas íntegramente en este informe**: diez principales y veintinueve complementarias de las doce fuentes delimitadas. Las complementarias se numeraron 2205–2233 después del último registro previo, 2204. No pretende cubrir todo el código ni todo el repositorio. Cada número mantiene su unidad distinta; sólo 2216 reúne una secuencia literalmente idéntica en dos ubicaciones.

Conservar una descripción significa mantener el original como contexto documental del producto o su fase, sin elevarlo a aprobación vigente ni convertirlo en orden universal al asistente. Modificar presenta el texto completo para sustituir la unidad indicada. Conservar o eliminar no presenta texto sustituto.

| Número | Acción | Efecto recomendado |
|---|---|---|
| [1220](#unidad-1220) | Conservar intacta | Mantener la fuente canónica de agentes. |
| [1221](#unidad-1221) | Conservar intacta | Distinguir fuentes de procedimientos y resultados generados. |
| [1222](#unidad-1222) | Conservar intacta | Mantener correspondencia de identificadores con el manifiesto. |
| [1223](#unidad-1223) | Modificar | Restringir copias adicionales cargables, permitiendo representación temporal necesaria. |
| [1224](#unidad-1224) | Modificar | Delimitar segundas copias cargables y describir sus fuentes relacionadas como contexto. |
| [1225](#unidad-1225) | Modificar | Conservar operaciones compartidas coherentes y responsabilidades propias de interfaces. |
| [1226](#unidad-1226) | Conservar intacta | Proteger perfiles reales frente a escrituras de pruebas. |
| [1228](#unidad-1228) | Conservar intacta | Conservar fuentes personales y personalizaciones no administradas. |
| [1229](#unidad-1229) | Modificar | Separar autorización vigente, identidad de operación e interacción exigida. |
| [1230](#unidad-1230) | Eliminar sin sustituto | Retirar la secuencia general obligatoria antes de cada commit. |
| [2205](#unidad-2205) | Conservar intacta | Mantener la referencia canónica en convenciones. |
| [2206](#unidad-2206) | Conservar intacta | Mantener formato y correspondencias de identificadores. |
| [2207](#unidad-2207) | Conservar intacta | Mantener nombres y estructura documentada de referencias. |
| [2208](#unidad-2208) | Conservar intacta | Mantener ámbito deliberado de instrucciones automáticas. |
| [2209](#unidad-2209) | Modificar | Reconciliar convenciones con la coherencia compartida de 1225. |
| [2210](#unidad-2210) | Conservar como descripción del producto | Mantener ausencia de reescritura incidental durante selección de capacidades. |
| [2211](#unidad-2211) | Conservar intacta | Mantener exclusión de archivos generados y temporales. |
| [2212](#unidad-2212) | Conservar intacta | Mantener perfiles temporales para pruebas. |
| [2213](#unidad-2213) | Conservar intacta | Mantener autoridad explícita para acciones externas y destructivas. |
| [2214](#unidad-2214) | Eliminar sin sustituto | Retirar una formulación parcial de las obligaciones globales de Git. |
| [2215](#unidad-2215) | Modificar | Conservar reproducibilidad con condición de ejecución explícita. |
| [2216](#unidad-2216) | Modificar | Mantener los cinco comandos completos como referencia por actividad y fase. |
| [2217](#unidad-2217) | Conservar intacta | Mantener aislamiento y materiales que no deben registrarse. |
| [2218](#unidad-2218) | Conservar intacta | Mantener el archivo que fija las dependencias y el uso de perfiles temporales. |
| [2219](#unidad-2219) | Modificar | Separar preparación, aplicación autorizada y observaciones en los siete pasos. |
| [2220](#unidad-2220) | Modificar | Evitar repetir una autorización suficiente para los efectos indicados. |
| [2221](#unidad-2221) | Conservar como descripción del producto | Mantener organización documentada de scripts como contexto. |
| [2222](#unidad-2222) | Modificar | Solicitar aprobación cuando falte autorización para la acción concreta. |
| [2223](#unidad-2223) | Conservar como condición documentada de lanzamiento | Mantener íntegra la secuencia en su fase, sin acreditar vigencia actual. |
| [2224](#unidad-2224) | Modificar | Conservar protocolo documentado y distinguir autorización de interacción. |
| [2225](#unidad-2225) | Conservar como descripción del producto | Mantener entrada humana documentada de la extensión. |
| [2226](#unidad-2226) | Modificar | Comprobar autorización por proveedor y pedir sólo la faltante. |
| [2227](#unidad-2227) | Conservar como descripción del desarrollo futuro | Mantener condiciones limitadas a un encargo que añada prompts. |
| [2228](#unidad-2228) | Modificar | Precisar que la ausencia de modificación autónoma describe al producto. |
| [2229](#unidad-2229) | Conservar como condición documentada de calidad | Mantener compilación estricta sin exigirla por toda edición. |
| [2230](#unidad-2230) | Conservar como descripción de un comando | Mantener actividad documentada de npm test sin ejecutarla. |
| [2231](#unidad-2231) | Conservar como condición documentada de lanzamiento | Mantener fase de los casos de ciclo y fallas. |
| [2232](#unidad-2232) | Modificar | Conservar contratos compartidos sin congelar responsabilidades. |
| [2233](#unidad-2233) | Conservar intacta | Mantener continuidad de códigos existentes sin limitar códigos nuevos. |

## Revisión íntegra de cada unidad

Las referencias de archivo y línea corresponden a las versiones identificadas en el registro de fuentes de este informe. Los originales reproducen literalmente las unidades registradas, incluidos guiones iniciales y todos los pasos. Las propuestas en español son textos para decidir, no instrucciones activas. Las relaciones explican dependencias sin sustituir el contenido de cada propuesta.

<a id="unidad-1220"></a>
### 1220 — Fuente canónica de agentes

**Original completo**

~~~~text
- Treat `agents/*.agent.md` as the canonical agent source.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1220. Principal. Procedencia de definiciones. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:5), línea 5. |
| Efecto técnico | Localiza dónde debe hacerse una corrección persistente. No prohíbe inspeccionar resultados ni acredita que la ubicación sea irrevocable. |
| Relación | 2205 expresa la misma procedencia en convenciones; 1221 distingue fuentes y resultados. La prioridad de encargos posteriores ya está en las instrucciones globales. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene una referencia local útil sin añadir instrucciones innecesarias. |
| Rechazar | Eliminarla perdería esa referencia; una sustitución para permitir migraciones hipotéticas atendería una prohibición no expresada. |

<a id="unidad-1221"></a>
### 1221 — Fuentes de procedimientos y resultados generados

**Original completo**

~~~~text
- Treat `skills/*` as canonical workflow modules; Codex bundles are rendered outputs, not editable source copies.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1221. Principal. Separación entre fuente y salida. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:6), línea 6. |
| Efecto técnico | Evita presentar una edición manual de salida como corrección permanente de la fuente. El original no prohíbe leer o comparar una salida. |
| Relación | 1220 y 2205 identifican fuentes de agentes; 2210 trata selección de capacidades. No hay evidencia de una prohibición de inspección que retirar. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene la distinción técnica de procedencia. |
| Rechazar | La eliminación perdería esa distinción. Reescribir por una supuesta prohibición de lectura corregiría una restricción ausente. |

<a id="unidad-1222"></a>
### 1222 — Correspondencia de identificadores

**Original completo**

~~~~text
- Keep stable agent IDs aligned with `agent-forge.manifest.jsonc`.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1222. Principal. Integridad de referencias. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:7), línea 7. |
| Efecto técnico | Protege correspondencia entre definiciones y manifiesto. La estabilidad no equivale a un veto explícito a una migración encargada. |
| Relación | 2206 concreta formato y correspondencias con casos de evaluación; las instrucciones globales establecen prioridad de correcciones posteriores. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene integridad de referencias actuales. |
| Rechazar | Eliminarla quitaría una protección útil; añadir excepciones hipotéticas no resuelve un obstáculo demostrado. |

<a id="unidad-1223"></a>
### 1223 — Copias en .claude/agents

**Original completo**

~~~~text
- Do not add or generate `.claude/agents`.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1223. Principal. Restricción de copias adicionales. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:8), línea 8; contexto en [product-overview.md](D:/Repositorios/agent-forge/project_docs/requirements/product-overview.md:16), línea 16, y [core-lifecycle.md](D:/Repositorios/agent-forge/project_docs/requirements/core-lifecycle.md:7), línea 7. |
| Efecto técnico | Prohíbe un destino sin distinguir instalación de representación temporal. Las fuentes atribuyen la restricción a identidades duplicadas; ese mecanismo está documentado, no comprobado aquí. |
| Relación | Decidir junto con 1224. No se cambia compatibilidad de plataformas ni descripciones del producto. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Conserva prevención documentada de duplicados y permite representar el caso cuando el desarrollo encargado lo requiera. |
| Rechazar | Permanece una prohibición de ruta que puede alcanzar material temporal necesario. No demuestra que toda representación cause duplicados. |

**Texto propuesto completo**

El asistente que desarrolla Agent Forge no debe añadir ni generar en .claude/agents una copia adicional que el entorno cargaría como los mismos agentes ya entregados por el producto. Cuando un encargo de desarrollo necesite representar esa ruta o esas definiciones como datos o dentro de un entorno temporal aislado, puede hacerlo sin instalarlas como otra copia cargable en el entorno del usuario.

<a id="unidad-1224"></a>
### 1224 — Copias locales y descubrimiento

**Original completo**

~~~~text
- Do not add project `.codex/agents`, project `.agents/skills`, or workspace discovery overrides for the canonical roster.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1224. Principal. Copias adicionales del mismo conjunto. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:9), línea 9. Párrafos relacionados: [repo-folder-setup.md](D:/Repositorios/agent-forge/project_docs/requirements/repo-folder-setup.md:21), línea 21, y [architecture.md](D:/Repositorios/agent-forge/project_docs/architecture/architecture.md:34), línea 34. |
| Efecto técnico | Evita copias locales del mismo conjunto y cambios de descubrimiento que lo dupliquen. Prohibir toda representación temporal de rutas excedería ese propósito. El funcionamiento del descubrimiento no se comprobó. |
| Relación | 1223 comparte la distinción. Los dos párrafos relacionados se conservan literalmente como descripción registrada del producto, sin convertirlos en prohibiciones generales al mantenedor. |
| Acción | Modificar la instrucción principal; conservar como contexto los párrafos relacionados. |
| Aceptar | La restricción conserva su propósito documentado sin impedir material temporal necesario del encargo. |
| Rechazar | La prohibición puede seguir interpretándose como impedimento general a representar el caso. No se autoriza ninguna copia adicional por rechazar la propuesta. |

**Texto propuesto completo para la instrucción principal**

El asistente que desarrolla Agent Forge no debe añadir en .codex/agents o .agents/skills del proyecto copias adicionales que el entorno cargaría como los mismos agentes o procedimientos canónicos ya entregados por el producto, ni modificar el descubrimiento del espacio de trabajo para cargar otra copia de ellos. Cuando el encargo necesite representar esas rutas o contenidos como datos o dentro de un entorno temporal aislado, puede hacerlo sin introducir otra copia cargable en el proyecto real o en el perfil personal.

**Párrafos relacionados completos que se propone conservar como descripción**

Fuente: D:\Repositorios\agent-forge\project_docs\requirements\repo-folder-setup.md, línea 21.

~~~~text
Canonical source discovery is intentionally not configured in `.vscode/settings.json`; installed user artifacts are resolved only from manifest targets. Scaffolding generates `AGENTS.md`, Copilot instructions, or both only from explicit runtime intent.

~~~~

Fuente: D:\Repositorios\agent-forge\project_docs\architecture\architecture.md, línea 34.

~~~~text
The repository does not advertise local discovery overrides and never creates project `.codex/agents` or `.agents/skills` copies. Cross-runtime ID equality is intentional; duplicate IDs within one runtime are errors.
~~~~

No se propone texto sustituto para estos párrafos. Su sujeto es el producto documentado; conservarlos no acredita su vigencia actual ni los convierte en prohibiciones generales al asistente que realiza mantenimiento autorizado.

<a id="unidad-1225"></a>
### 1225 — Operaciones compartidas e interfaces

**Original completo**

~~~~text
- Route deployment behavior through `packages/core`; CLI, extension, and PowerShell code are adapters.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1225. Principal. Responsabilidades técnicas de componentes. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:10), línea 10. |
| Efecto técnico | Centralizar instalación, propiedad y recuperación evita divergencias. Convertir la ruta actual y la condición de adaptador en límites permanentes puede impedir corregir responsabilidades propias de una interfaz. |
| Relación | Aceptar junto con 2209 y 2232; 2221 queda como descripción de scripts actuales. Las otras descripciones de capas conservan contexto, sin constituir un veto adicional. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Protege coherencia sin exigir nueva autorización por cada decisión arquitectónica rutinaria del encargo. |
| Rechazar | La organización actual puede seguir impidiendo resolver un defecto en el componente correspondiente. Aceptar no inicia una reorganización. |

**Texto propuesto completo**

El asistente que desarrolla Agent Forge debe mantener una implementación coherente de las operaciones de instalación, conservación de archivos ajenos, estado y recuperación que comparten las interfaces. Actualmente esa implementación se encuentra en packages/core, y la interfaz de comandos, la extensión y los scripts de PowerShell la utilizan. Cada interfaz puede resolver las responsabilidades propias de su entorno. Si el encargo requiere reorganizar responsabilidades o ubicaciones, el asistente debe realizar los cambios técnicos necesarios dentro de ese encargo y conservar la coherencia de las operaciones compartidas entre los consumidores afectados.

<a id="unidad-1226"></a>
### 1226 — Pruebas y perfiles reales

**Original completo**

~~~~text
- Never write to real `~/.copilot`, `~/.codex`, or `~/.agents` profile paths from tests.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1226. Principal. Protección de destinos personales reales. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:11), línea 11. |
| Efecto técnico | Distingue los destinos reales de perfiles temporales; protege personalizaciones frente a escrituras de pruebas. |
| Relación | 2212, 2217 y 2218 reiteran aislamiento. 2219 describe una operación sobre perfil real, que es una actividad diferente con autorización propia. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Los tres destinos siguen protegidos explícitamente. |
| Rechazar | Eliminarla quitaría la referencia local específica. Otras protecciones siguen vigentes, sin volver inútil esta restricción. |

<a id="unidad-1228"></a>
### 1228 — Conservación del entorno personal

**Original completo**

~~~~text
- Preserve global `~/.codex/AGENTS.md`, `~/.codex/config.toml`, personal `~/.codex/skills`, and every unmanaged customization.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1228. Principal. Archivos personales y no administrados. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:12), línea 12. |
| Efecto técnico | Evita alteración incidental del entorno personal. Incluye todas las personalizaciones no administradas, además de los destinos enumerados. |
| Relación | 2217 y 2218 tratan conservación y exclusiones; core-lifecycle y architecture describen propiedad. Las instrucciones globales conservan sus protecciones y la prioridad de encargos posteriores. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Conserva una protección concreta sin añadir excepciones para trabajos hipotéticos. |
| Rechazar | La eliminación quitaría la condición local, sin anular protecciones globales. Esta revisión no autoriza tocar fuentes personales. |

<a id="unidad-1229"></a>
### 1229 — Autorización e identidad de la operación

**Original completo**

~~~~text
- Require immutable-plan or deployment-ID confirmation for deploy, cleanup, rollback, wipe, provider installation, and external operations.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1229. Principal. Condiciones para operaciones con efectos. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:13), línea 13. |
| Efecto técnico | Mezcla autorización humana, identificación de transacción y entrada de herramienta. Se extiende a operaciones que no usan identificador de instalación, provocando solicitudes repetidas o imposibles. |
| Relación | Reconciliar 2220, 2222, 2224 y 2226. 2225 y ejemplos de comandos describen interfaz real y conservan su protocolo. 2213 exige autoridad explícita sin repetirla. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Conserva autorización por efectos y destino y protocolo de herramienta, sin confirmaciones añadidas por la regla. |
| Rechazar | Permanece la mezcla de permiso e identificador, incluso para pasos autorizados u operaciones sin ese identificador. |

**Texto propuesto completo**

Antes de realizar una instalación, limpieza, recuperación, eliminación de archivos administrados, instalación de proveedores u otra operación con efectos externos, el asistente debe comprobar que la autorización vigente de Roberto cubre esa acción, sus efectos y su destino. Para una operación que utiliza un plan o una instalación identificada, debe utilizar el identificador concreto correspondiente y respetar el protocolo de confirmación que exige la herramienta. No debe exigir un identificador de instalación a una operación que no lo utiliza ni pedir de nuevo una autorización suficiente que siga vigente. Si la interfaz exige una interacción humana que el asistente no puede realizar, debe solicitar únicamente esa interacción y explicar a qué operación autorizada corresponde. El mantenimiento autorizado del programa se rige por el alcance de ese encargo y no equivale a aplicar una operación sobre un perfil real.

<a id="unidad-1230"></a>
### 1230 — Secuencia general antes de cada commit

**Original completo**

~~~~text
- Run the root build, tests, roster validation, and staged diff checks before committing.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 1230. Principal. Condición universal de comprobación. |
| Fuente | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:14), línea 14. |
| Efecto técnico | Exige compilación, pruebas y validación general con cada commit. El obstáculo específico es esa condición universal, incluso para documentación. |
| Relación | Aceptar con precisiones 2215 y 2216. 2223 y 2231 conservan lanzamiento; 2229 y 2230 describen calidad y comandos. Las instrucciones globales conservan comprobaciones pertinentes y revisión de cambios preparados. |
| Acción | Eliminar sin sustituto local. |
| Aceptar | Se retira la obligación universal. Permanecen revisión del diff preparado, git diff --cached --check, protección de secretos y trabajo ajeno, y comprobaciones aplicables al cambio y su fase. |
| Rechazar | Todo commit seguiría activando la secuencia general. Las condiciones globales por fase no eliminarían esta condición local. |

<a id="unidad-2205"></a>
### 2205 — Referencia canónica en convenciones

**Original completo**

~~~~text
- `agents/*.agent.md` is the sole canonical roster.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2205. Complementaria. Procedencia. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:3), línea 3. |
| Efecto técnico | Localiza la fuente de agentes sin acreditar aprobación de su contenido o composición. |
| Relación | 1220 identifica la misma fuente. Se conserva como unidad distinta; no se modifica el conjunto producido. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene procedencia consistente entre convenciones e instrucciones. |
| Rechazar | Su eliminación quitaría esta referencia sin resolver una contradicción demostrada. |

<a id="unidad-2206"></a>
### 2206 — Formato de identificadores

**Original completo**

~~~~text
- Stable IDs are lowercase kebab-case and match manifest keys and evaluation fixture names.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2206. Complementaria. Identificadores y referencias. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:4), línea 4. |
| Efecto técnico | Documenta minúsculas separadas por guiones y correspondencia entre consumidores; no acredita un veto humano a migraciones futuras. |
| Relación | 1222 exige alineación con manifiesto. Las instrucciones globales regula alcance de cambios encargados; no hace falta otra regla de migración. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Conserva convención concreta sin modificar nombres ni casos de evaluación. |
| Rechazar | Perdería formato y correspondencia útil. No hay evidencia de que sean causa de un obstáculo actual. |

<a id="unidad-2207"></a>
### 2207 — Nombres y referencias de procedimientos

**Original completo**

~~~~text
- Skills use lowercase matching directories and frontmatter names; detailed material stays one level under `references/`.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2207. Complementaria. Convenciones de formato. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:5), línea 5. |
| Efecto técnico | Relaciona nombres declarados, directorios y referencias. No encarga revisar los procedimientos producidos. |
| Relación | 1221 identifica fuentes; repo-folder-setup describe estructura. Un cambio posterior encargado prevalecería conforme al global. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene consistencia documentada de nombres y referencias. |
| Rechazar | La eliminación perdería la convención sin contradicción demostrada. Conservarla no acredita aprobación permanente de toda estructura. |

<a id="unidad-2208"></a>
### 2208 — Ámbito de instrucciones automáticas

**Original completo**

~~~~text
- Automatically deployed instructions declare intentional `applyTo`.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2208. Complementaria. Ámbito declarado. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:6), línea 6. |
| Efecto técnico | applyTo declara dónde se pretende aplicar la instrucción. No decide qué instrucciones nuevas debe producir el proyecto. |
| Relación | repo-folder-setup describe intención de entorno para archivos generados. No se añaden instrucciones locales ni resultados. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene una condición explícita de ámbito. |
| Rechazar | Perdería claridad sin atender un impedimento demostrado. |

<a id="unidad-2209"></a>
### 2209 — Responsabilidades compartidas en convenciones

**Original completo**

~~~~text
- The core package is authoritative; CLI, extension, and scripts are adapters.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2209. Complementaria. Límites de componentes. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:7), línea 7. |
| Efecto técnico | Repite autoridad del paquete como límite de capas y puede reinstaurar una organización fija tras cambiar 1225. |
| Relación | Aceptar junto con 1225 y 2232. 2221 se conserva como descripción actual de scripts. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Las convenciones dejan de imponer el límite rígido que corrige 1225. |
| Rechazar | Aunque cambie 1225, esta fuente puede mantener el mismo impedimento. |

**Texto propuesto completo**

El asistente que desarrolla Agent Forge debe conservar una implementación coherente de las operaciones compartidas por la interfaz de comandos, la extensión y los scripts. Actualmente esas operaciones se implementan en el paquete packages/core. Las interfaces pueden asumir responsabilidades propias de sus entornos. Una reorganización que forme parte del encargo debe conservar los contratos compartidos que consumen las interfaces afectadas.

<a id="unidad-2210"></a>
### 2210 — Selección de modelos y capacidades

**Original completo**

~~~~text
- Source agents are never rewritten during model/capability selection.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2210. Complementaria. Operación documentada del producto. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:8), línea 8. |
| Efecto técnico | La selección del producto no reescribe fuentes incidentalmente. No prohíbe un mantenimiento encargado sobre ellas. |
| Relación | 1220 y 1221 mantienen procedencia; 2228 distingue ejecución de mantenimiento autorizado. |
| Acción | Conservar literalmente como descripción del producto. Sin sustituto. |
| Aceptar | Mantiene contexto de esa operación sin trasladarlo a una prohibición general. No se confirma funcionamiento actual. |
| Rechazar | Interpretarlo como orden absoluta bloquearía mantenimiento autorizado; eliminarlo retiraría contexto sin haber evaluado el producto. |

<a id="unidad-2211"></a>
### 2211 — Archivos generados y temporales

**Original completo**

~~~~text
- Generated `dist/`, `out/`, coverage, extension test profiles, and deployment fixtures are ignored.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2211. Complementaria. Exclusión de artefactos. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:9), línea 9. |
| Efecto técnico | Identifica materiales que no deben registrarse como fuente. No confirma funcionamiento de exclusiones, pues no se inspeccionó configuración. |
| Relación | 2217 y 2218 expresan exclusiones; las instrucciones globales prohíbe registrar materiales temporales y generados. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Conserva detalle propio del proyecto. |
| Rechazar | Perdería detalle local, sin retirar prohibiciones globales. |

<a id="unidad-2212"></a>
### 2212 — Perfiles temporales para pruebas

**Original completo**

~~~~text
- Tests use temporary user profiles and never the real `~/.copilot` directory.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2212. Complementaria. Aislamiento. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:10), línea 10. |
| Efecto técnico | Protege Copilot real y fija entorno temporal; no exige ejecutar pruebas para toda tarea. |
| Relación | 1226 protege los tres destinos; 2217 y 2218 describen aislamiento en otras fuentes. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Conserva condición concreta de la actividad de pruebas. |
| Rechazar | Quita la referencia en convenciones, aunque otras fuentes mantengan protección. |

<a id="unidad-2213"></a>
### 2213 — Autoridad explícita para efectos externos

**Original completo**

~~~~text
- Production/cloud/push/release/destructive actions require explicit authority.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2213. Complementaria. Autorización. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:11), línea 11. |
| Efecto técnico | Exige autoridad explícita para las acciones enumeradas; no exige volver a pedir una autorización suficiente que siga vigente. |
| Relación | 1229, 2220, 2222 y 2224 distinguen autorización, identificador e interacción; las instrucciones globales mantiene condiciones de publicaciones y operaciones. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Sigue señalando acciones que requieren autoridad expresa. |
| Rechazar | Quita referencia local sin retirar exigencias globales. Reescribir sólo para repetir persistencia de autorización no atiende conflicto presente. |

<a id="unidad-2214"></a>
### 2214 — Formulación local de Git

**Original completo**

~~~~text
- Work occurs on dedicated `codex/*` branches with atomic Conventional Commits.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2214. Complementaria. Ramas y commits. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:12), línea 12. |
| Efecto técnico | Repite ramas dedicadas y Conventional Commits, sin condiciones de origen, conservación e integración. atomic no define una obligación adicional precisa y podría usarse para fragmentar el encargo. |
| Relación | Las instrucciones globales establecen ramas, conservación, preparación explícita, asuntos de Conventional Commits, comprobaciones e integración. Permanece completo. |
| Acción | Eliminar sin sustituto local. |
| Aceptar | Retira una repetición imprecisa; no elimina ramas dedicadas, commits locales ni obligaciones globales. |
| Rechazar | Mantiene una frase parcial junto a la fuente más precisa y una condición adicional sin explicación suficiente. |

<a id="unidad-2215"></a>
### 2215 — Dependencias, compilación y pruebas

**Original completo**

~~~~text
- Build with the committed npm lockfile: `npm ci`, `npm run build`, `npm test`.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2215. Complementaria. Comandos y condiciones. |
| Fuente | [repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:13), línea 13. |
| Efecto técnico | Agrupa instalación, compilación y pruebas como una instrucción única. Sin condición puede restablecer obligación universal retirada en 1230. |
| Relación | Aceptar con 1230 y 2216. 2218 conserva archivo de dependencias y exclusiones; 2230 describe npm test. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Mantiene reproducibilidad y comandos, con condición explícita. |
| Rechazar | La secuencia puede seguir exigiéndose de forma universal. |

**Texto propuesto completo**

Cuando el encargo requiera instalar las dependencias del proyecto a partir de su archivo package-lock.json registrado, el asistente debe utilizar npm ci. La documentación identifica npm run build como comando de compilación y npm test como comando de pruebas. El asistente debe ejecutar esas actividades cuando correspondan al cambio o a condiciones vigentes de su fase; esta secuencia no es una preparación obligatoria para cada tarea ni una condición automática de cada commit.

<a id="unidad-2216"></a>
### 2216 — Secuencia completa de comandos documentados

**Original completo**

~~~~text
```powershell
npm ci
npm run build
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
```
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2216. Complementaria. Procedimiento completo en dos ubicaciones. |
| Fuente | [README.md](D:/Repositorios/agent-forge/README.md:18), línea 18; copia idéntica en [build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:14), línea 14. |
| Efecto técnico | Los títulos describen verificación, pero no distinguen qué tareas deben ejecutar todos los comandos. Son comandos documentados; no se confirmó ejecución actual. |
| Relación | Cambiar ambas ubicaciones junto con 1230 y 2215. 2223 y 2231 describen lanzamiento. No borrar scripts ni evaluaciones. |
| Acción | Modificar la presentación mediante el texto y los cinco comandos siguientes. |
| Aceptar | Conserva información completa sin restablecer obligación universal. |
| Rechazar | Las secuencias pueden usarse como exigencia general. Cambiar una sola ubicación dejaría diferencia entre fuentes. |

**Texto propuesto completo**

Los siguientes comandos son la secuencia documentada para preparar y realizar la verificación completa del proyecto desde su raíz. El asistente debe usar las actividades que correspondan al cambio autorizado y a las condiciones vigentes de integración o lanzamiento. La existencia de esta secuencia no exige instalar dependencias ni ejecutar todos sus comandos para cada edición o commit.

```powershell
npm ci
npm run build
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
```

<a id="unidad-2217"></a>
### 2217 — Aislamiento y exclusiones en README

**Original completo**

~~~~text
All filesystem tests use temporary profiles. Build output, test profiles, user customizations, secrets, and deployment mirrors are not committed.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2217. Complementaria. Pruebas y materiales excluidos. |
| Fuente | [README.md](D:/Repositorios/agent-forge/README.md:26), línea 26. |
| Efecto técnico | Describe pruebas de sistema de archivos en perfiles temporales y materiales no registrables. No requiere ejecutar pruebas por toda edición documental. |
| Relación | 1226, 1228, 2211, 2212 y 2218 expresan protecciones compatibles. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene la explicación concreta; no acredita aislamiento observado. |
| Rechazar | Elimina la explicación en README sin retirar otras protecciones. |

<a id="unidad-2218"></a>
### 2218 — Dependencias reproducibles y rutas temporales de perfil

**Original completo**

~~~~text
`npm ci` is authoritative for `package-lock.json`. Core and CLI `dist`, extension `out`, isolated profiles, and deployment fixtures are ignored. Tests inject temporary `USERPROFILE` and never write real `.copilot`, `.codex`, or `.agents` directories.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2218. Complementaria. Preparación y aislamiento documentados. |
| Fuente | [build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:22), línea 22. |
| Efecto técnico | Describe npm ci, exclusiones e inyección de USERPROFILE. No se comprobó implementación actual de la inyección. |
| Relación | 2215 y 2216 delimitan cuándo se ejecutan actividades; 1226 mantiene destinos protegidos. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene información útil para actividades pertinentes, sin instalar dependencias para toda tarea. |
| Rechazar | Perdería detalles de aislamiento sin resolver una contradicción. |

<a id="unidad-2219"></a>
### 2219 — Procedimiento completo sobre perfil real

**Original completo**

~~~~text
Before approval:

1. hash `~/.codex/AGENTS.md` and `~/.codex/config.toml`;
2. inventory existing `~/.codex/skills`, `~/.codex/agents`, and `~/.agents/skills`;
3. inspect all plan cleanup actions;
4. apply the exact confirmed plan;
5. verify 24 Copilot agents, 16 Codex agents, and five prefixed Codex bundles;
6. verify state reports both runtimes synchronized;
7. confirm the protected hashes and personal skill inventory are unchanged.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2219. Complementaria. Condición inicial y siete pasos completos. |
| Fuente | [build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:60), línea 60. |
| Efecto técnico | Before approval incluye aplicar un plan ya confirmado: contradicción temporal comprobada en el texto. Las cifras del paso 5 son referencias documentadas, cuya vigencia no acredita esta revisión. |
| Relación | Reconciliar con 1229, 2224 y 2225; 1228 conserva fuentes personales y 2223 describe lanzamiento. No convertirlo en preparación para todo desarrollo. |
| Acción | Modificar mediante el procedimiento completo siguiente. |
| Aceptar | Cambia el momento de aplicación y evita pedir de nuevo una autorización suficiente. Conserva los siete pasos y las cantidades originales sin decidir composición de agentes ni ejecutar una instalación. El paso 5 propuesto conserva 24 agentes Copilot, 16 agentes Codex y cinco paquetes Codex con prefijo porque revisar esas cantidades queda fuera del encargo; conservar el texto no confirma que sigan vigentes. |
| Rechazar | Permanece aplicación bajo el encabezado anterior a aprobación y el riesgo de convertir cifras en obligaciones actuales sin evidencia. |

**Texto propuesto completo**

Este procedimiento documenta una instalación sobre un perfil real; no es una preparación obligatoria para mantener el repositorio. El asistente debe contar con autorización vigente para aplicar el plan concreto y respetar la interacción que exija la herramienta. Los pasos 1 a 3 se realizan antes de aplicar; el paso 4 sólo se realiza cuando la operación está autorizada; los pasos 5 a 7 son observaciones posteriores.

1. Antes de aplicar, el asistente calcula los hashes de ~/.codex/AGENTS.md y ~/.codex/config.toml.
2. Antes de aplicar, el asistente obtiene el inventario existente de ~/.codex/skills, ~/.codex/agents y ~/.agents/skills.
3. Antes de aplicar, el asistente inspecciona todas las acciones de limpieza del plan.
4. Cuando la autorización vigente cubra la aplicación del plan concreto y se haya cumplido el protocolo de la herramienta, el asistente aplica exactamente ese plan confirmado.
5. Después de aplicar, el asistente verifica 24 agentes Copilot, 16 agentes Codex y cinco paquetes Codex con prefijo.
6. Después de aplicar, el asistente observa si el estado informa que ambos entornos están sincronizados, conforme al plan aplicado y la operación autorizada.
7. Después de aplicar, el asistente confirma que los hashes protegidos y el inventario de procedimientos personales no cambiaron.

Si la autorización no cubre aplicar el plan, la preparación no debe incluir esa aplicación. Autorizar una instalación no autoriza por sí mismo otras operaciones externas ni la eliminación de archivos no administrados; el asistente debe comprobar si el encargo incluye expresamente esas otras acciones.

<a id="unidad-2220"></a>
### 2220 — Autorización para acciones enumeradas

**Original completo**

~~~~text
Publishing the extension, pushing Git branches, provider installation, cloud mutation, or deletion of unmanaged files requires separate authorization.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2220. Complementaria. Alcance de autorización. |
| Fuente | [build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:70), línea 70. |
| Efecto técnico | separate authorization puede interpretarse como otra solicitud incluso cuando Roberto ya autorizó efectos y destino. |
| Relación | Aceptar con 1229, 2222 y 2224. 2213 mantiene autoridad explícita y 1228 conservación de archivos ajenos. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Conserva separación por efectos sin otra pregunta por una acción autorizada. |
| Rechazar | Puede exigir aprobación adicional independientemente del alcance real de autorización existente. |

**Texto propuesto completo**

Antes de publicar la extensión, publicar ramas de Git, instalar proveedores, modificar recursos de nube o eliminar archivos no administrados, el asistente debe comprobar que Roberto autorizó expresamente esa acción, sus efectos y su destino. Si la autorización vigente ya los cubre, no debe pedirla de nuevo. Si no los cubre, debe solicitar únicamente la autorización pendiente antes de realizar esa acción. La autorización de una instalación de Agent Forge no autoriza por sí misma las otras acciones de esta enumeración.

<a id="unidad-2221"></a>
### 2221 — Organización documentada de scripts

**Original completo**

~~~~text
PowerShell scripts invoke the CLI. They contain no renderer, raw copier, broad delete, model downloader, or MCP secret writer.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2221. Complementaria. Descripción de arquitectura. |
| Fuente | [architecture.md](D:/Repositorios/agent-forge/project_docs/architecture/architecture.md:57), línea 57. |
| Efecto técnico | Describe scripts que invocan comandos y excluye varias funciones. No se inspeccionó código ni se acreditó prohibición humana de reorganización encargada. |
| Relación | 1225, 2209 y 2232 regulan mantenimiento coherente; descripciones actuales no deben reintroducir veto al encargo. |
| Acción | Conservar literalmente como descripción del producto. Sin sustituto. |
| Aceptar | Conserva organización registrada con vigencia no acreditada. |
| Rechazar | Interpretarlo como orden absoluta puede bloquear una responsabilidad necesaria; eliminarlo borra contexto sin evaluar funcionamiento. |

<a id="unidad-2222"></a>
### 2222 — Acciones sujetas a aprobación

**Original completo**

~~~~text
- Cloud, production, push, release, downloads, control actions, and destructive operations remain approval-gated.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2222. Complementaria. Autorización de efectos. |
| Fuente | [architecture.md](D:/Repositorios/agent-forge/project_docs/architecture/architecture.md:89), línea 89. |
| Efecto técnico | approval-gated no distingue autorización vigente de solicitud nueva. downloads y control actions tienen un alcance no precisado. |
| Relación | Reconciliar con 1229, 2220 y 2224; no trasladar esta decisión a permisos o capacidades de agentes producidos. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Sustituye las etiquetas imprecisas por una condición sobre acciones con efectos externos y autorización vigente. Esto cambia el alcance de la restricción: deja de tratar cualquier descarga o acción de control como motivo automático para otra aprobación. Las autorizaciones exigidas por las instrucciones globales y la plataforma permanecen vigentes. |
| Rechazar | Mantiene condición imprecisa que puede reinstaurar aprobaciones reiteradas. |

**Texto propuesto completo**

Cuando una acción de nube, producción, publicación remota, lanzamiento, descarga, control de un servicio o eliminación tenga efectos externos, el asistente debe comprobar que la autorización vigente cubre esa acción y su destino, y respetar los permisos y las políticas de la plataforma. Debe solicitar aprobación sólo cuando falte una autorización requerida para la acción concreta; no debe tratar una autorización suficiente ya vigente como si hubiera caducado por avanzar al siguiente paso.

<a id="unidad-2223"></a>
### 2223 — Secuencia documentada de lanzamiento

**Original completo**

~~~~text
Release requires build, package tests, extension-host tests, 24 Copilot evaluations, 16 Codex agent evaluations, five bundle evaluations, lifecycle and failure fixtures, strict dual-runtime validation, an immutable live preview, unchanged global `AGENTS.md`, zero unmanaged cleanup actions, applied-plan hash equivalence, and synchronized runtime status.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2223. Complementaria. Procedimiento de lanzamiento. |
| Fuente | [architecture.md](D:/Repositorios/agent-forge/project_docs/architecture/architecture.md:94), línea 94. |
| Efecto técnico | La unidad enumera lanzamiento. Su amplitud no demuestra inutilidad ni aprobación humana vigente de cada condición y cantidad. |
| Relación | 1230 retira condición por commit; 2216 conserva comandos y 2231 fase de lanzamiento. Las cifras y evaluaciones del producto no se evalúan. |
| Acción | Conservar literalmente como condición documentada de lanzamiento. Sin texto sustituto. |
| Aceptar | Conserva el original completo y su condición explícita de lanzamiento. Esta revisión no acredita aprobación o vigencia actual de cada requisito o cantidad; tampoco propone modificarlos. |
| Rechazar | Eliminar o reescribir la unidad retiraría o alteraría condiciones del producto sin un defecto demostrado en su condición de ejecución. Usarla para todo cambio perdería su delimitación explícita a lanzamiento. |

<a id="unidad-2224"></a>
### 2224 — Protocolo documentado y autorización

**Original completo**

~~~~text
Immutable plan ID confirmation is required for deploy and cleanup; active deployment ID confirmation is required for wipe and extension rollback. Production, cloud, release, push, provider installation, downloads, and destructive operations require the user's separate approval. No auto-confirm flag or setting exists.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2224. Complementaria. Descripción del programa e instrucción de autorización. |
| Fuente | [core-lifecycle.md](D:/Repositorios/agent-forge/project_docs/requirements/core-lifecycle.md:47), línea 47. |
| Efecto técnico | Reúne identificadores y ausencia de confirmación automática con aprobación separada. La redacción no puede crear automatización ausente ni evadir interfaz real. |
| Relación | Aceptar con 1229, 2220, 2222 y 2226. 2225 conserva entrada humana de extensión. No modificar comandos ni programa con esta propuesta. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Conserva identidad de operaciones y protocolo documentado, separado de solicitudes adicionales. |
| Rechazar | separate approval puede seguir exigiendo otra aprobación aun existiendo una suficiente. La ausencia documental de automatización permanece. |

**Texto propuesto completo**

El protocolo documentado de Agent Forge exige confirmar el identificador del plan inmutable para instalación y limpieza, y el identificador de la instalación activa para eliminación administrada y recuperación desde la extensión. El protocolo del producto no incluye una opción o configuración de confirmación automática. Antes de ejecutar operaciones de producción, nube, lanzamiento, publicación remota, instalación de proveedores, descarga u operaciones destructivas, el asistente debe comprobar que la autorización vigente cubre la acción, sus efectos y su destino. Si ya existe autorización suficiente, no debe solicitarla de nuevo. Debe respetar el protocolo real de la herramienta y, cuando éste exija una interacción humana que no pueda realizar, solicitar sólo esa interacción para la operación autorizada. Un encargo de mantenimiento del programa no equivale a autorizar estas operaciones sobre un perfil real.

<a id="unidad-2225"></a>
### 2225 — Entrada humana en la extensión

**Original completo**

~~~~text
Profile mutations require the exact immutable plan/deployment ID typed by the user.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2225. Complementaria. Oración completa sobre interfaz. |
| Fuente | [extension-and-cli.md](D:/Repositorios/agent-forge/project_docs/requirements/extension-and-cli.md:33), línea 33. |
| Efecto técnico | Describe quién introduce identificador. No pide otra autorización por mantener el repositorio ni demuestra que el asistente pueda introducirlo por el usuario. |
| Relación | 1229 y 2224 separan autorización e interacción. Conservar las otras oraciones del párrafo sobre complemento y configuración de proveedores. |
| Acción | Conservar literalmente como descripción del producto. Sin sustituto. |
| Aceptar | Mantiene protocolo descrito. Si una operación autorizada exige esa entrada humana, se pide sólo la interacción. No se confirma funcionamiento actual. |
| Rechazar | Eliminarla ocultaría una limitación sin modificarla; tratarla como aprobación por todo paso trasladaría una condición del producto al mantenimiento. |

<a id="unidad-2226"></a>
### 2226 — Autorización por proveedor

**Original completo**

~~~~text
4. Request explicit approval for each addable provider.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2226. Complementaria. Paso completo de un procedimiento. |
| Fuente | [mcp-tool-management.md](D:/Repositorios/agent-forge/project_docs/requirements/mcp-tool-management.md:14), línea 14. |
| Efecto técnico | Solicita aprobación por proveedor incluso cuando una autorización previa ya los nombra. Sólo se cambia esa condición. |
| Relación | Aceptar con 1229, 2220 y 2224. Los otros siete pasos permanecen; no se altera catálogo, vista previa, interfaz oficial, autenticación o tratamiento de secretos. No se preparan proveedores por toda tarea. |
| Acción | Modificar únicamente el paso mediante el texto siguiente. |
| Aceptar | Sigue requiriendo autorización respecto de cada proveedor, sin pedirla dos veces. |
| Rechazar | Mantiene solicitud obligatoria incluso para proveedores expresamente autorizados. |

**Texto propuesto completo**

4. Para cada proveedor que pueda añadirse, el asistente debe comprobar que la autorización vigente de Roberto cubre añadir ese proveedor y su destino. Si ya lo cubre, continúa conforme al protocolo de la herramienta; si no, solicita aprobación explícita para ese proveedor antes de añadirlo. Las interacciones de confianza o autenticación que la interfaz exija deben respetarse y no equivalen por sí solas a una nueva autorización del encargo.

<a id="unidad-2227"></a>
### 2227 — Incorporación futura de prompts

**Original completo**

~~~~text
Adding prompts later requires a manifest schema revision, a dedicated current VS Code prompt target, ownership coverage, collision tests, and diagnostics. It must not reuse a legacy `%APPDATA%/Code/User/prompts` abstraction.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2227. Complementaria. Condición de desarrollo futuro. |
| Fuente | [prompts-and-hooks.md](D:/Repositorios/agent-forge/project_docs/requirements/prompts-and-hooks.md:7), línea 7. |
| Efecto técnico | Adding prompts later delimita cuándo importan esquema, destino, propiedad, colisiones y diagnósticos. No impone actividades a otro mantenimiento ni encarga añadir capacidad. |
| Relación | El mismo documento separa mecanismos presentes y futuros; repo-folder-setup describe intención de creación. No se investigan plataformas o destinos nuevos. |
| Acción | Conservar literalmente como descripción del desarrollo futuro. Sin sustituto. |
| Aceptar | Mantiene referencia específica sin afirmar vigencia de plataforma o aprobación actual de añadirla. |
| Rechazar | Eliminarla pierde contexto; usarla como condición universal excede el sujeto expresado. |

<a id="unidad-2228"></a>
### 2228 — Sujeto de la modificación autónoma

**Original completo**

~~~~text
- No autonomous roster, skill, tool, manifest, or governance self-modification.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2228. Complementaria. Ejecución frente a mantenimiento. |
| Fuente | [non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:11), línea 11. |
| Efecto técnico | La falta de sujeto puede transformar una propiedad del producto en veto al asistente que mantiene sus fuentes. |
| Relación | 2210 distingue selección y mantenimiento; las instrucciones globales conservan alcance autorizado. No se modifican componentes del conjunto producido. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Conserva propiedad documental y elimina ambigüedad que puede bloquear mantenimiento encargado. |
| Rechazar | Puede seguir interpretándose un cambio encargado como modificación autónoma prohibida. |

**Texto propuesto completo**

La ejecución de Agent Forge no debe modificar por iniciativa propia el conjunto de agentes, los procedimientos reutilizables, las herramientas, el manifiesto ni las instrucciones que gobiernan el producto. Esta condición describe el comportamiento del producto; no impide al asistente realizar cambios de mantenimiento en esas fuentes cuando formen parte de un encargo autorizado de Roberto. Un encargo de mantenimiento no autoriza por sí mismo una operación de instalación en el entorno personal.

<a id="unidad-2229"></a>
### 2229 — Compilación estricta documentada

**Original completo**

~~~~text
- Strict TypeScript builds for core, CLI, and extension source.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2229. Complementaria. Condición de calidad. |
| Fuente | [non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:22), línea 22. |
| Efecto técnico | Describe compilación estricta TypeScript de tres componentes. No contiene condición antes de cada commit ni exige ejecutarla en esta revisión. |
| Relación | 2215 y 2216 identifican comandos y condiciones; 1230 es la obligación universal que se retira. No se inspeccionó configuración TypeScript. |
| Acción | Conservar literalmente como condición documentada de calidad. Sin sustituto. |
| Aceptar | Conserva condición para desarrollo que la afecte, sin afirmar implementación ni aprobación humana actual. |
| Rechazar | Eliminarla retira calidad sin contradicción demostrada; imponerla por toda edición excede el texto. |

<a id="unidad-2230"></a>
### 2230 — Actividad documentada de npm test

**Original completo**

~~~~text
- Package tests and evaluation fixture validation run with `npm test`.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2230. Complementaria. Descripción de comando. |
| Fuente | [non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:23), línea 23. |
| Efecto técnico | Describe lo atribuido a npm test. No se leyeron scripts ni se ejecutó para confirmar su alcance. |
| Relación | 2215 y 2216 conservan comandos por actividad; 2223 y 2231 distinguen lanzamiento. No se evalúan archivos de casos. |
| Acción | Conservar literalmente como descripción de comando. Sin sustituto. |
| Aceptar | Conserva información de uso sin convertirla en obligación general. |
| Rechazar | Suprimirla pierde información; tratarla como mandato por commit reinstaura obligación que la oración no expresa. |

<a id="unidad-2231"></a>
### 2231 — Casos de ciclo y fallas en lanzamiento

**Original completo**

~~~~text
- Lifecycle and failure-mode fixtures are release gates.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2231. Complementaria. Condición de lanzamiento. |
| Fuente | [non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:26), línea 26. |
| Efecto técnico | La frase ya delimita lanzamiento. No se evaluó amplitud o costo ni se acreditó origen humano. |
| Relación | 2223 presenta la secuencia registrada; 1230 retira condición general por commit; las instrucciones globales conservan exigencias válidas por fase. |
| Acción | Conservar literalmente como condición documentada de lanzamiento. Sin sustituto. |
| Aceptar | Conserva fase sin declarar aprobación renovada ni imponerla a tareas ordinarias. |
| Rechazar | Eliminarla retira una condición sin evidencia; utilizarla en toda tarea pierde su condición explícita. |

<a id="unidad-2232"></a>
### 2232 — Responsabilidades de comandos y extensión

**Original completo**

~~~~text
Both adapters import `@agent-forge/core`; neither owns rendering, collision policy, state migration, transaction, rollback, or cleanup behavior.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2232. Complementaria. Distribución de responsabilidades. |
| Fuente | [extension-and-cli.md](D:/Repositorios/agent-forge/project_docs/requirements/extension-and-cli.md:3), línea 3. |
| Efecto técnico | Describe importación y excluye seis responsabilidades. Como orden absoluta puede impedir una reorganización necesaria del encargo. |
| Relación | Aceptar con 1225 y 2209. 2221 queda como descripción de scripts; las enumeraciones de módulos son organización registrada. |
| Acción | Modificar mediante el texto completo siguiente. |
| Aceptar | Conserva descripción de importación y permite decisiones técnicas necesarias dentro del encargo. |
| Rechazar | La exclusión absoluta puede restablecer el límite corregido en otras fuentes. |

**Texto propuesto completo**

La interfaz de comandos y la extensión utilizan actualmente @agent-forge/core para las operaciones compartidas de generación de artefactos, tratamiento de colisiones, migración de estado, transacciones, recuperación y limpieza. El asistente que desarrolla Agent Forge debe conservar contratos coherentes para esas operaciones y resolver en cada interfaz las responsabilidades propias de su entorno. Si el encargo requiere cambiar la distribución de responsabilidades o dependencias, debe hacerlo dentro de ese alcance y mantener la coherencia entre los consumidores afectados.

<a id="unidad-2233"></a>
### 2233 — Estabilidad de códigos de diagnóstico

**Original completo**

~~~~text
- Diagnostic codes `AF001` through `AF012` remain stable.
~~~~

| Campo | Contenido |
|---|---|
| Número y alcance | 2233. Complementaria. Continuidad de interfaz del programa. |
| Fuente | [non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:31), línea 31. |
| Efecto técnico | Mantiene continuidad de códigos existentes que pueden consumir comandos, extensión o documentación. El original no prohíbe añadir otros códigos. No se inspeccionaron diagnósticos implementados. |
| Relación | architecture y non-functional describen diagnósticos estructurados; 1225 y 2232 mantienen coherencia de consumidores. No se añade requisito de evaluación. |
| Acción | Conservar intacta. Sin texto sustituto. |
| Aceptar | Mantiene una condición concreta de compatibilidad, sin ampliar su alcance a códigos nuevos. |
| Rechazar | La eliminación retiraría continuidad de interfaz sin un problema demostrado. Conservarla no acredita funcionamiento o aprobación renovada de todos los diagnósticos. |

## Consecuencias del conjunto y dependencias

Conservar una regla no acredita implementación ni comportamiento observado. Eliminar una repetición local no elimina obligaciones que sigan en las instrucciones globales. Las propuestas tampoco crean permisos, herramientas o conocimientos nuevos en el modelo. La siguiente tabla contiene las dependencias identificadas para aplicar este informe sin dejar el mismo impedimento en otra de sus unidades; no pretende enumerar toda dependencia del producto.

| Decisiones relacionadas | Condición para mantener coherencia documental |
|---|---|
| 1223 y 1224 | Aceptar juntas las precisiones de copias cargables y representaciones temporales evita que una prohibición alcance el caso permitido por la otra. En 1224, conservar sus dos párrafos relacionados como descripción del producto. |
| 1225, 2209 y 2232; contexto 2221 | Sustituir las tres reglas con la misma distinción entre operaciones compartidas y responsabilidades propias. 2221 conserva organización registrada de scripts, sin veto absoluto al mantenimiento. |
| 1229, 2220, 2222, 2224 y 2226; contexto 2213 y 2225 | Reconciliar frases de autorización. 2213 conserva autoridad explícita y 2225 interacción de extensión; aceptar sólo 1229 dejaría solicitudes reiteradas en otras fuentes. |
| 1230, 2215 y ambas ubicaciones de 2216; contexto 2218, 2229 y 2230 | Retirar condición universal y precisar cuándo corresponden comandos sin borrar información de preparación, calidad o pruebas. |
| 2219; contexto 1228, 2223, 2224, 2225 y 2231 | Precisar los momentos del procedimiento 2219 y conservar íntegramente 2223 y 2231 como condiciones documentadas de lanzamiento. El origen y vigencia no acreditados limitan las afirmaciones del informe, sin convertirlos en cambios de requisitos del producto. |
| 2214 y obligaciones globales de Git | Retirar repetición local reconociendo que las instrucciones globales conservan ramas, commits, comprobaciones e integración. |
| 2228; contexto 2210 | Precisar el sujeto del producto sin transformar selección de capacidades en veto general a mantenimiento. |
| 2233; contexto 1225 y 2232 | Conservar continuidad de códigos existentes al distinguir responsabilidades de componentes; no añadir limitaciones a códigos nuevos. |

Una aceptación parcial debe expresar qué condición decidió Roberto en cada fuente. No exige ampliar revisión a código, agentes producidos o funcionamiento operativo. Una diferencia puede ser intencional; no debe presentarse como si dos condiciones incompatibles expresaran una misma instrucción.

## Cuatro casos escritos para entender las decisiones

Los cuatro casos siguientes son ejemplos explicativos para los temas solicitados. No son pruebas ejecutadas, casos de evaluación nuevos ni encargos para intervenir el producto.

| Caso | Quién realiza qué y bajo qué condiciones |
|---|---|
| Documentación | Ante un encargo de corregir una explicación, el asistente lee la fuente pertinente, redacta y comprueba nombres, rutas y comandos documentados. Eliminar 1230 y modificar 2215–2216 evitaría exigir toda la secuencia por registrar ese cambio. Permanecen comprobaciones documentales pertinentes y obligaciones globales de Git. Roberto no necesita autorizar nuevamente cada frase o archivo necesario dentro del encargo. |
| Defecto | Ante un defecto encargado en la recuperación de una operación interrumpida al cerrar la extensión, el asistente analiza la coordinación con el ciclo de vida de la extensión y la recuperación compartida. Las propuestas 1225, 2209 y 2232 permiten decidir la ubicación de cada responsabilidad necesaria, manteniendo el comportamiento común entre interfaces. Es un supuesto explicativo, no un defecto observado en el producto. Si el defecto afecta conservación de archivos, 1226 y 2212 mantienen perfiles temporales para las pruebas pertinentes; esto no autoriza modificar el perfil real. |
| Arquitectura | Ante un encargo que requiera reorganizar una responsabilidad, el asistente compara consecuencias y realiza los cambios necesarios dentro del alcance. Las propuestas conservan coherencia de consumidores sin reservar para siempre funciones a una ruta. Roberto conserva decisiones sustanciales de producto no delegadas; el asistente consulta sólo diferencias importantes que el encargo y la evidencia no resuelvan. |
| Operación autorizada | Si Roberto autorizó aplicar un plan concreto al destino indicado, el asistente comprueba identidad y efectos y respeta protocolo real. 1229 y 2224 evitan repetir autorización. Si la extensión exige que Roberto escriba el identificador, 2225 mantiene esa interacción y el asistente pide sólo introducirlo para la operación autorizada. 2219 coloca inventario y hashes antes, aplicación autorizada después y observación al final. No autoriza publicar ramas, instalar otro proveedor o eliminar archivos ajenos. |

## Conocimiento técnico pertinente

Las fuentes muestran la necesidad de razonar sobre procedencia de archivos, referencias entre identificadores, contratos de datos y responsabilidades entre interfaces. Una operación que administra personalizaciones requiere distinguir perfiles reales y temporales, propiedad, hashes, estado persistido y recuperación ante fallas. Conocer integración de extensiones con VS Code, comportamiento de comandos y rutas de Windows ayuda a decidir dónde resolver un defecto y qué interacción humana exige una herramienta.

Estos son ejemplos de conocimiento pertinente, no una lista exhaustiva ni un catálogo permanente de puestos o especialidades. Precisar instrucciones permite utilizar criterio dentro de un encargo; no incorpora nuevas capacidades al producto ni demuestra incremento de capacidad del asistente. No se proponen roles, cambios de delegación, instalaciones, fuentes de investigación o actividades de evaluación.

## Fuentes, versiones y límites de lectura

La primera lectura técnica correspondió a un especialista en sistemas de agentes y herramientas de desarrollo, con GPT-6.1 Sol y razonamiento alto. Un arquitecto de software, con GPT-6 Astra y razonamiento alto, examinó los efectos conjuntos. Un redactor técnico, con GPT-6.1 Sol y razonamiento alto, preparó los textos completos a partir de las conclusiones integradas. El asistente coordinador revisó las propuestas y responde por este informe. Ninguno tuvo autorización para modificar las instrucciones activas o el producto.

Las doce copias completas siguientes son las fuentes documentales delimitadas. SHA-256 identifica la versión documental utilizada, no una comprobación del comportamiento del producto.

| Fuente original dentro de D:/Repositorios/agent-forge | Documento original | Líneas | SHA-256 registrado |
|---|---|---|---|
| .github/copilot-instructions.md | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:1) | 14 | e517638facfa7b9ddbb449acd6c603e4ad6d6e836a108bf409202f554fbfea1c |
| README.md | [README.md](D:/Repositorios/agent-forge/README.md:1) | 82 | e18bfae7a7be599b04dcef6014c72da4c0eaa5cd2ff7400eccc30c8d8f3928ad |
| project_docs/knowledge/repo-conventions.md | [project_docs/knowledge/repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:1) | 13 | e8e75ddd36e963ba84acbc83ce34bd9abc7d55f1af007ceebbb486e918245bc3 |
| project_docs/requirements/build-and-install.md | [project_docs/requirements/build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:1) | 70 | 76a1dbd301471f23dc149c812f8d59a232f30878ed55fcd296fd21fc58fa3980 |
| project_docs/architecture/architecture.md | [project_docs/architecture/architecture.md](D:/Repositorios/agent-forge/project_docs/architecture/architecture.md:1) | 94 | 1c5a82cb74db6e31ae824ef72ed75fda73545f1d7c0c6a551b4126ff91570445 |
| project_docs/requirements/product-overview.md | [project_docs/requirements/product-overview.md](D:/Repositorios/agent-forge/project_docs/requirements/product-overview.md:1) | 39 | c03ae23efbb8acfb3580b97ddb05ab9228924a7e56655767a518c1b5e63d85ff |
| project_docs/requirements/core-lifecycle.md | [project_docs/requirements/core-lifecycle.md](D:/Repositorios/agent-forge/project_docs/requirements/core-lifecycle.md:1) | 47 | 8e4a6f9dee0a26e8556a371fc36a113c24802b0f7b04bf7eb1b43eec1e6e6008 |
| project_docs/requirements/non-functional.md | [project_docs/requirements/non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:1) | 32 | a6048436aa170392666da9526341cbe933863f236c0269ff4fc8397393f6f298 |
| project_docs/requirements/extension-and-cli.md | [project_docs/requirements/extension-and-cli.md](D:/Repositorios/agent-forge/project_docs/requirements/extension-and-cli.md:1) | 35 | 5a4b4c373213b889bfa468bd9b3e5b97e047a3ffaa20141a131517d4772d618a |
| project_docs/requirements/repo-folder-setup.md | [project_docs/requirements/repo-folder-setup.md](D:/Repositorios/agent-forge/project_docs/requirements/repo-folder-setup.md:1) | 21 | 11b75152a710831d7d9a0a52a0c16f36aaf90c5906211bea3611044531da6fe9 |
| project_docs/requirements/prompts-and-hooks.md | [project_docs/requirements/prompts-and-hooks.md](D:/Repositorios/agent-forge/project_docs/requirements/prompts-and-hooks.md:1) | 13 | 9ea7eb0170bde54740dfe5d373d0916919f83b319b523cd8f85df3c35d1d9139 |
| project_docs/requirements/mcp-tool-management.md | [project_docs/requirements/mcp-tool-management.md](D:/Repositorios/agent-forge/project_docs/requirements/mcp-tool-management.md:1) | 26 | 66ba2e67f28ab270a8452a2c68224373af61671c59695f45fcb9f01a5078c46e |

La procedencia registrada corresponde a rama codex/collaboration-instructions-v7, commit cf6f7f92b7cd025cfbc23032ec34efbd9794d0f9, árbol 9746845eba08f7b0a40b7b97073d4217004e1b38 y development 6913209f3a9c502f8d9eb9d1a124b4137231f937. Ambas ramas tenían el mismo contenido al iniciar la revisión. El informe se prepara en la rama dedicada codex/review-work-rules-20261001, creada desde development; las fuentes enumeradas permanecen sin cambios.

Se consultaron las [instrucciones globales](C:/Users/rober/.codex/AGENTS.md) y las catorce cláusulas del [acuerdo versión 7](C:/Users/rober/Downloads/Acuerdo_colaboracion_Roberto_y_prompts_v7.md). La [copia mantenida de las instrucciones globales](<D:/Proyectos/Codex setup and customization/config/AGENTS.md>) contiene los mismos bytes que el archivo global examinado. Estos documentos permanecen intactos. Las instrucciones históricas de aplicación por plataforma incluidas después del acuerdo no se ejecutaron como encargos nuevos.

Las siguientes referencias explican las comparaciones utilizadas en este informe; no pretenden resumir todas las cláusulas del acuerdo:

| Referencia vigente | Aplicación en esta revisión |
|---|---|
| Acuerdo, cláusulas 2 y 3 | El asistente resuelve los pasos necesarios del encargo sin pedir de nuevo una autorización suficiente. Fundamentan la distinción entre autorización e interacción de una herramienta en 1229, 2220, 2222, 2224 y 2226. |
| Acuerdo, cláusulas 6 y 7 | El asistente evalúa y resuelve opciones técnicas del trabajo autorizado; Roberto conserva decisiones sustanciales no delegadas. Permiten cuestionar la rigidez de 1225, 2209 y 2232 sin encargar una reorganización adicional. |
| Acuerdo, cláusula 10 | Las comprobaciones dependen del cambio y de su fase. Sustenta retirar la condición universal de 1230 y conservar las condiciones documentadas de lanzamiento 2223 y 2231 sin convertirlas en exigencias para toda edición. |
| Acuerdo, cláusulas 12, 13 y 14 | Exigen distinguir propuestas, cambios guardados y carga comprobada; explicar acciones y condiciones; e indicar el alcance de los listados. Por ello se presentan originales y propuestas completos y se declara qué se examinó. |
| Instrucciones globales, «Git y protección del trabajo» | Conservan ramas dedicadas, commits locales, revisión de cambios preparados, conservación de trabajo ajeno e integración local. Eliminar 2214 o 1230 no elimina estas obligaciones. |
| Instrucciones globales, «Intención, evidencia y autorización» | Conservan el alcance del encargo y la necesidad de resolver decisiones sustanciales pendientes. Modificar una regla local no concede permisos que la plataforma no ofrece ni autoriza otras operaciones. |

La lista siguiente es completa respecto de las exclusiones de actividad de este encargo, sin enumerar todas las políticas de plataforma:

- No se analizaron ni modificaron agentes producidos, sus guías, modelos, delegación o instalaciones.
- No se inspeccionaron código, scripts de pruebas, configuración ejecutable o salidas generadas para evaluar funcionamiento.
- No se ejecutaron pruebas, compilaciones, comandos del producto, instalaciones, cambios de perfiles u operaciones externas.
- No se investigó en la web ni se emprendió auditoría de autoría humana o vigencia de todas las decisiones.
- No se modificaron acuerdo, globales, fuentes del producto o resultados. El único documento de entrega creado en Agent Forge es este informe.

Los comandos se contrastaron con las copias: la secuencia de 2216 coincide en README y build-and-install y conserva los cinco comandos. Rutas y líneas corresponden al registro y las copias. Los enlaces apuntan al documento original con su línea o a unidades dentro del informe; las versiones utilizadas se identifican por los hashes del registro anterior. Esto valida referencia documental, no existencia actual de compilados, ejecución, compatibilidad de versiones ni carga efectiva de instrucciones.

El coordinador identificó .github/copilot-instructions.md y no un AGENTS.md local en el repositorio. Este informe analiza lo que los documentos exigen cuando se consultan; no se comprobó su carga automática en Codex dentro de VS Code ni en Codex de escritorio. No se atribuye a esta revisión un cambio efectivo de comportamiento o capacidad observado, y no se investigó configuración de carga para resolver esa incógnita.

Quedan sin acreditar la autoría humana de todas las decisiones, su aprobación actual, el funcionamiento presente de descubrimiento, aislamiento, confirmación y recuperación, y compatibilidad de plataformas. No hay mediciones de mejora. Son límites de afirmación, no nuevas auditorías o condiciones para decidir todas las reglas.

## Aplicación posterior únicamente documental

La secuencia siguiente es completa respecto de la aplicación documental propuesta por este informe. Depende de las decisiones de Roberto; no autoriza ahora editar el producto ni ejecutar actividades descritas.

1. Registrar la decisión de Roberto por número. Antes de aplicar cambios, comprobar el estado del repositorio, conservar una copia recuperable de los archivos afectados y trabajar en una rama dedicada conforme a las instrucciones globales, sin incorporar ni descartar trabajo previo. Conservar este informe y los originales fuera de instrucciones activas. Si acepta parcialmente, registrar las diferencias de condición.
2. En .github/copilot-instructions.md, aplicar sólo sustituciones aceptadas de 1223, 1224, 1225 y 1229 y eliminación aceptada de 1230. Conservar 1220, 1221, 1222, 1226 y 1228 sin sustituto.
3. En project_docs/knowledge/repo-conventions.md, coordinar 2209 con 1225 y 2232; aplicar eliminación aceptada de 2214 y precisión aceptada de 2215. Mantener demás unidades, con 2210 como descripción del producto.
4. En README.md y project_docs/requirements/build-and-install.md, aplicar conjuntamente ambas ubicaciones de 2216 si se acepta. En build-and-install aplicar 2219 y 2220 según decisión, preservando siete pasos y contexto. No ejecutar comandos.
5. En project_docs/architecture/architecture.md, aplicar la decisión aceptada de 2222 y conservar 2221 como descripción y 2223 como condición documentada de lanzamiento. Conservar íntegro el párrafo de línea 34 relacionado con 1224 como descripción registrada del producto. Conservar igualmente el párrafo de línea 21 en project_docs/requirements/repo-folder-setup.md, sin convertirlo en prohibición general del mantenedor.
6. En project_docs/requirements/core-lifecycle.md, aplicar 2224 si se acepta. En project_docs/requirements/extension-and-cli.md, aplicar 2232 si se acepta y conservar 2225 y las otras oraciones de su párrafo.
7. En project_docs/requirements/mcp-tool-management.md, sustituir únicamente paso 2226 si se acepta. En project_docs/requirements/non-functional.md, sustituir 2228 si se acepta y conservar 2229, 2230 y 2231 con condición documental de calidad, comando y lanzamiento; conservar 2233 sin imponer restricciones a códigos nuevos. Conservar 2227 en prompts-and-hooks como referencia de capacidad futura no encargada.
8. Leer texto guardado y comprobar correspondencia entre decisiones y ubicaciones, integridad de originales conservados, siete pasos de 2219, cinco comandos de 2216 y coherencia de dependencias y enlaces. La comprobación es documental y no ejecuta validación del producto.
9. Registrar únicamente los cambios documentales aceptados mediante commits locales e integrar la rama terminada en development conforme a las instrucciones globales. Entregar la relación de decisiones aplicadas y de cualquier ubicación pendiente. La publicación remota requiere su autorización correspondiente. Guardar los archivos no demuestra que los chats ya abiertos reciban las instrucciones nuevas ni que una plataforma las cargue automáticamente.
