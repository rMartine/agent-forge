# Consultor sénior de tecnología e IA: implementación y comprobaciones

Fecha: 3 de octubre de 2026. Encargo: diseñar e implementar el consultor independiente de Agent Forge acordado en el chat Consultor. La consulta de fuentes, el plan y las decisiones se recuperaron del chat después del apagado. No había una implementación del consultor guardada; se creó en la rama `codex/technology-ai-logistics-consultant`, desde `development` en `3b7a5f4`.

## Resultado utilizable

El módulo [consulting-specialist](../packages/consulting-specialist/README.md) contiene el perfil nativo `technology-ai-logistics-consultant`, ocho skills de contenido, una skill de coordinación, contexto local separado por cliente y proyecto, siete hooks e instalación con vista previa, verificación y reversión. El perfil hereda modelo, razonamiento y permisos. Atiende consultoría y diseño técnico internacional según el cliente; la invocación no autoriza por sí misma prototipos, envíos o cambios en sistemas.

Para usarlo en una sesión nueva de Codex: «Usa al consultor de tecnología e IA para preparar la propuesta de este cliente». El contexto del cliente se conserva en `.consulting/<cliente>/<proyecto-del-cliente>/`. Su aislamiento organiza información; no constituye una barrera de seguridad del sistema operativo. Los hooks comprueban condiciones observables y no certifican calidad semántica o veracidad.

## Selección de skills y fuentes

La siguiente tabla conserva la selección de cuatro candidatos del plan; no es un inventario exhaustivo ni una evaluación ejecutada de los cuatro.

| Paquete | Lo revisado para el plan | Decisión y alcance de la evidencia |
|---|---|---|
| [Management Consulting de anotb](https://github.com/anotb/management-consulting-plugin) | Catálogo, instrucciones pertinentes, soporte declarado para Codex y licencia MIT | Base elegida por cubrir procesos, economía, propuestas, planificación y entregables. Se adaptaron seis procedimientos; su idoneidad no equivale a superioridad universal demostrada. |
| [Claude Consulting Skills de Oria](https://github.com/andreworia/claude-consulting-skills) | Once skills y licencia MIT en la versión consultada | Referencia comparativa ejecutada sobre los tres casos sintéticos acordados. |
| [Consulting Skills Lab](https://github.com/Uky0Yang/consulting-skills-lab) | Catálogo y documentación; diseñado para Codex y declara MIT | Alternativa para transformación con IA y documentos de decisión. No se instaló ni evaluó su ejecución. |
| [24 Strategy Skills](https://github.com/Natan-Mohart/24-strategy-skills-for-claude) | Documentación y licencia MIT | Alternativa para métodos y cálculos estratégicos. No se instaló ni evaluó su ejecución en Codex. |

Las seis adaptaciones de Management Consulting corresponden a `strategic-analysis`, `process-excellence`, `financial-modeling`, `proposal-development`, `implementation-planning` y `client-deliverables`, fijadas al commit `40ffcc54721553ea8b3efb34451163dfa0fbc6f0` de la versión declarada 2.2.0. Se conservan autoría, seis copias de la licencia MIT y [procedencia de cada adaptación](../packages/consulting-specialist/sources.json). Se añadieron dos procedimientos propios sobre logística, aduanas y transporte y sobre diseño de soluciones tecnológicas y de IA.

Las licencias seleccionadas no requieren comprar las skills. El uso de Codex conserva sus costos y condiciones existentes. Esta implementación no incorpora suscripciones, servicios externos ni instaladores del paquete de origen.

## Instalación y pruebas del módulo

Se instalaron 42 archivos propios y siete grupos de hooks en el perfil local de Roberto. `node install.mjs verify` confirmó su coincidencia con el módulo. La instalación comprobó 81 archivos ajenos, sin cambios, y conservó los grupos de hooks preexistentes. Se modificó el archivo compartido `hooks.json` únicamente para añadir los grupos propios. No se modificaron `config.toml`, instrucciones generales, modelos, permisos ni registros de confianza mediante el instalador.

Las nueve skills pasaron el validador de estructura de Codex. Se revisaron sus metadatos, referencias y atribución. La última ejecución de `npm.cmd test`, con Node 22.22.3, produjo **13 pruebas aprobadas, ninguna fallida ni omitida**, incluida la ejecución real del comando corregido mediante PowerShell sobre un perfil temporal. Esta ejecución ocurrió antes del plan final de corrección; no se repitió la batería al aplicarlo. Las pruebas ejecutadas abarcan:

- Separación entre clientes, proyectos y sesiones; rechazo de rutas inválidas, dispositivos reservados y enlaces; conservación de archivos existentes.
- Rechazo del cambio de cliente de un actor establecido sin crear una carpeta adicional, y conservación del estado interrumpido al actualizar su asignación.
- Eventos de actores ajenos sin efectos, vinculación de sesión principal y subagente, límites explícitos con denegación solo ante contradicción observable, advertencia ante campos no observables y ausencia de decisiones que concedan permisos.
- Estados de herramientas, errores anidados, conservación de metadatos sin copiar argumentos o resultados completos, cierre e interrupción sin forzar continuación y entradas inválidas.
- Instalación y reversión en perfiles temporales, conservación de agentes y skills ajenos, detección de vistas previas desactualizadas y rechazo de modificaciones no conciliadas en archivos propios.

Los casos son controlados y no prueban todos los mecanismos de aislamiento del sistema operativo ni todas las herramientas alojadas. La comprobación de instalación y reversión utilizó perfiles temporales; no se desinstalaron los agentes previos de Roberto.

## Descubrimiento y ejecución nativos

Un proceso nuevo de `Codex Desktop/0.160.0` con `CODEX_HOME` explícito reconoció las nueve skills y los siete hooks, sin errores en esos elementos. Después de la confirmación de Roberto, los siete devolvieron `enabled: true` y `trustStatus: trusted`. Una consulta sin herramientas al catálogo nativo identificó el rol exacto. El archivo local `consulting-validation/native-discovery.json` conserva esa observación.

Los primeros procesos de comprobación devolvieron catálogos incompletos. No se interpretaron como falta de instalación; la consulta con el perfil explícito y acceso al entorno real resolvió el descubrimiento. Un intento de crear al consultor en una sesión efímera falló con `no rollout found`. La sesión persistente `01a10031-a58b-75f2-acc8-b5d13d09922c` creó `/root/comprobacion_consultoria`, que devolvió el cálculo local correcto: 20 horas actuales, 5 horas hipotéticamente liberadas, USD 120 de valor equivalente y USD 40 de diferencia frente al software, sin afirmar ahorro de efectivo. Esa prueba no creó el registro de hooks y no se presenta como evidencia de su ejecución.

La sesión original de Desktop conservó el catálogo anterior y rechazó el perfil nuevo como desconocido. Roberto autorizó el chat nuevo `01a10036-0b03-7383-afd5-d857934ced17`. Allí se creó el consultor `01a10037-142d-7dd3-a64a-5653673bbe1e` y respondió correctamente, pero su asignación permaneció preparada sin identidad ni operaciones registradas. No recibió contexto adicional del hook. No se repitió la creación en ese chat.

La comprobación del comando instalado mediante PowerShell reprodujo un `ParserError`: un ejecutable y un argumento entre comillas no constituyen una invocación válida en ese shell. La alternativa `node "ruta/hooks.mjs"` terminó con código cero y JSON válido. Se corrigió el instalador para declarar `commandWindows` con esa forma, usando Node disponible en PATH. La corrección se aplicó a la configuración activa: cambiaron únicamente `hooks.json` y la documentación instalada; se conservaron los 81 archivos ajenos comprobados y los grupos de hooks preexistentes. La consulta nativa devolvió los siete hooks habilitados con confianza `modified`, pendiente de renovación por Roberto según la [documentación de hooks de Codex](https://learn.chatgpt.com/docs/hooks). No se modificaron registros de aprobación. La comprobación directa del comando no demuestra por sí sola que esta sintaxis explique toda la falta de ejecución observada en Desktop.

Roberto confirmó posteriormente que volvió a aceptar los siete hooks. Se realizó la única comprobación adicional autorizada en el mismo chat de validación. El consultor respondió que no recibió contexto adicional; la consulta posterior conservó la asignación en `prepared` con `agentId: null`. La corrección de la sintaxis de PowerShell, por tanto, no resolvió la vinculación observada en Desktop. El intento previo de abrir una asignación anónima fue rechazado porque ya existía el contexto del cliente ficticio; se conservó esa asignación y se creó una sola instancia nueva. `consulting-validation/desktop-correction-result.md` conserva el resultado. Se detuvieron los reintentos y no se investigó otra causa durante este plan acotado.

Después del intento anterior, Roberto informó que Codex había vuelto a pedir aceptación, confirmó que ya la había concedido y autorizó repetir una vez la misma comprobación. Esta repetición fue satisfactoria: el consultor confirmó recibir el contexto del hook y reportó `01a10049-24d7-7523-ac07-23ef6862c4a1`; una consulta de estado encontró ese mismo identificador vinculado y estado `returned`. Se realizó una sola creación y una sola consulta. El reporte local conserva ambos intentos. Quedó cumplida la aceptación acotada acordada; no se inició otro diagnóstico ni se probaron de forma nativa los demás eventos.

## Comparación ejecutada con Oria

Se prepararon los [tres casos sintéticos](../packages/consulting-specialist/evaluation-cases.md) antes de recibir las respuestas. Dos agentes distintos recibieron los mismos casos e instrucciones de entrega, sin consultar los resultados del otro. El registro nativo de ambos confirmó `gpt-6-astra` con razonamiento `xhigh`, heredados sin sustitución. Compartieron las instrucciones generales vigentes y las herramientas locales para presentaciones. Uno utilizó únicamente las skills consultivas de Oria del commit `d22e7b01af4071a65fca2e6e8156c705e3723c23`; el otro utilizó las ocho skills de contenido del módulo, congeladas antes del ejercicio.

Cada agente entregó dos documentos Markdown, una respuesta Markdown y un PowerPoint de cinco diapositivas con texto y tablas nativas editables. No hubo investigación externa, datos de clientes, ejecución en sistemas operativos del cliente ni servicios externos. El coordinador revisó los textos y cálculos; además inspeccionó las diapositivas de apertura y escenario económico de ambas presentaciones. Cada autor comprobó la estructura y renderizó e inspeccionó las cinco diapositivas de su archivo.

| Criterio previsto y caso | Resultado observado con Oria | Resultado observado con las skills adaptadas |
|---|---|---|
| Cobertura y sustento: propuesta documental aduanera | Propuesta editable con revisión humana, fuentes por valor, dependencias y ausencia de envío automático; no inventa clasificación, credenciales ni normativa. | Mismo alcance sustantivo; distingue transcribir un código de verificar su clasificación y conserva excepciones y evidencia documental. |
| Cálculos y respuesta a objeciones: recuperación en seis meses | 400 horas actuales, 160 supuestas, USD 3,840 de capacidad valorizada; recuperación condicional de 6.82 meses, al cierre del mes siete. Rechaza garantía y distingue efectivo. | Mismos cálculos correctos; explicita además la proporción del valor efectivamente realizable y evita contar dos veces las horas. Rechaza garantía. |
| Viabilidad y decisiones vigentes: transporte | Conserva el sistema, recomienda plantilla, reglas y CSV condicionado al importador; separa ocho horas de espera de tres minutos de trabajo y conserva confirmación humana. | Conserva los mismos límites, considera conciliación, respuestas tardías y el punto de autorización según los efectos reales de importar. No inventa API ni ahorro. |
| Sustento y utilidad: decisión ejecutiva | Presentación editable y respuesta. 45/50 describe la muestra; no garantiza precisión. Costos EUR 32,000, beneficio supuesto EUR 36,000, saldo EUR 4,000, retorno simple 12.5% y recuperación condicional de diez meses. | Presentación editable y respuesta con los mismos cálculos y límites. Incluye escenario sin beneficio y condiciones propuestas del piloto. |

Ambos paquetes atendieron los criterios importantes de estos tres casos. La comparación respalda que la adaptación es adecuada para este alcance; **no demuestra superioridad general, equivalencia estadística ni calidad independiente del modelo**. Es una ejecución por paquete, revisada por el coordinador que implementó el módulo, sin calificación ciega. Los casos sintéticos no representan desempeño aduanero real ni cumplimiento normativo. No se modificaron las skills a partir de las respuestas de evaluación, ni se descartaron casos.

Los archivos de ambas presentaciones pasaron comprobaciones de integridad, objetos editables, reimportación y cálculos. No se abrieron en Microsoft PowerPoint. Los autores no observaron recortes ni superposiciones en las imágenes renderizadas. La revisión por imágenes y XML no acredita interacción de edición en PowerPoint.

La evidencia local permanece fuera de Git en `D:\Proyectos\Agent Forge\consulting-validation`, con las carpetas `reference-output` y `candidate-output`. Cada una contiene entregables, scripts de comprobación y registros dentro de `build`. Las huellas SHA-256 de las presentaciones revisadas son:

- Adaptación: `fe80e3790c53f417ae59b1499317318d74d99d30c6f6438b41e8bfba612b41a6`.
- Oria: `4e2a325cea7f05fcde80af7f14c3f5d143e12095f8ecb7443b63dac8cb3ebe14`.

## Entrega de código

El cambio se limita a `packages/consulting-specialist`, el enlace de documentación en `README.md` y este informe. El trabajo previo del checkout `D:\Repositorios\agent-forge`, incluida su documentación preparada, permanece ajeno a esta entrega. La rama `development` recibió durante el encargo una corrección independiente del plugin de investigación; el módulo de consultoría no modifica esos archivos. La publicación remota no está autorizada y no forma parte de esta entrega.

Los archivos del agente y la corrección quedaron registrados en el commit local `cb1db27`. Tras la repetición satisfactoria autorizada por Roberto, procede la integración local de la rama dedicada en `development` mediante `--no-ff`, conservando el historial y sin publicación remota.
