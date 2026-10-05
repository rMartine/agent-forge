# Comparación de modelos por responsabilidad

Se completaron 32 asignaciones sintéticas: dos configuraciones para cada uno de los 16 especialistas. Veintinueve cumplieron todos los criterios de su caso y tres no los cumplieron. Las asignaciones elegidas están en el manifiesto y en la [matriz de agentes](../architecture/codex-product-agents.md). Este resultado no acredita todavía la ejecución del modelo configurado mediante los archivos de especialistas en ambos clientes.

Los requisitos, criterios y comprobaciones de `evals/codex/models/cases.mjs` se definieron antes de solicitar respuestas. El SHA-256 original fue `8c2fe2ae09f776929d0b95ee5086cb9c800af435ca757c7b0b719e780959f0e1`. Los [resultados revisados](../../evals/codex/models/observed-results.json) conservan las 32 observaciones, hashes de entregables, comprobaciones, valoración de cada criterio y las 16 decisiones. Los materiales de ejecución permanecen en la caché local excluida de Git. No se usaron datos de Liravo o Skillara.

## Configuraciones elegidas

Esta tabla cubre los 16 especialistas. «Cumple» significa que satisfizo el caso delimitado, no que demostró superioridad general para cualquier tarea de esa profesión.

| Especialista | Configuración elegida | Resultado de la alternativa y motivo |
|---|---|---|
| Arquitectura | `gpt-6.1-sol`, `high` | Astra/high también cumple; Sol pertenece a la categoría de menor costo acordada. |
| Implementación e integración | `gpt-6.1-sol`, `high` | Astra/high también cumple; misma regla de selección. |
| Backend | `gpt-6-luna`, `high` | Sol/high también cumple; Luna pertenece a la categoría de menor costo acordada. |
| Frontend | `gpt-6.1-sol`, `medium` | Luna/high deja actualizar el estado tras una respuesta obsoleta o desmontaje; no cumple todos los criterios. |
| Bases de datos | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| .NET | `gpt-6-luna`, `high` | Sol/high también cumple; selección por categoría. |
| Escritorio | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| Desarrollo móvil | `gpt-6-luna`, `high` | Sol/high omite protección ante callbacks destructivos repetidos y criterios de velocidad y confirmación o recuperación; no cumple todos los criterios previos. |
| Aprendizaje automático | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| Sistemas con agentes | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| Gemelos digitales | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| Calidad | `gpt-6-luna`, `high` | Sol/high también cumple; selección por categoría. |
| Seguridad | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| Operaciones | `gpt-6.1-sol`, `high` | Astra/high también cumple; selección por categoría. |
| Experiencia de usuario | `gpt-6.1-sol`, `medium` | Luna/high evita doble clic mientras espera, pero no resuelve la inscripción duplicada al reintentar después de perder una respuesta. |
| Documentación técnica | `gpt-6-luna`, `high` | Sol/medium también cumple; selección por categoría. |

Se eligieron nueve configuraciones Sol/high, dos Sol/medium y cinco Luna/high. La categoría es la política de selección acordada; no se midieron importes de suscripción ni se demostró menor consumo real de tokens. Duración y consumo permanecen desconocidos cuando la herramienta no los devuelve. No se modificaron los modelos internos de Liravo o Skillara ni el modelo de la conversación principal.

## Ejecución y comprobaciones

Las 16 respuestas de implementación se sometieron a comprobaciones independientes de comportamiento y preservación de archivos suministrados. Todas pasaron. En calidad, el programa independiente exige que las pruebas acepten una implementación correcta y detecten tres variantes defectuosas: los fallos que el especialista encontró en la implementación inicial son evidencia esperada, no un fracaso de su asignación. Los casos de .NET ejecutaron el programa de aceptación con el SDK instalado.

El agente principal leyó las otras 16 respuestas y evaluó los criterios fijados. Trece cumplieron y tres presentaron las omisiones de la tabla. La valoración de interfaz y móvil fue estática; no acredita comportamiento en navegador o dispositivo. Se comprobó que Worklets 0.5.1 de Liravo exporta las APIs de transición al hilo JavaScript citadas en el caso móvil; no se compiló ni modificó Liravo.

La delegación nativa recibió explícitamente cada configuración sin cambiar permisos. Algunos agentes ejecutaron varias asignaciones independientes bajo la misma configuración, con directorios e instrucciones separados y sin acceso a las respuestas de otros modelos; no fueron 32 conversaciones aisladas desde cero. Las guías instaladas quedaron fuera de los directorios de evaluación y no se cargaron: esta comparación evalúa las tareas por responsabilidad, no la integración de todas las guías. El modelo observado por hooks y la precedencia del archivo TOML se comprueban por separado en los clientes.

El primer intento por CLI no produjo respuesta por certificados. Otro intento con conexión normal produjo respuesta, pero no pudo inspeccionar sus materiales por restricciones de ejecución. No se contaron como resultados de calidad. La revisión automática rechazó añadir `windows.sandbox="elevated"` por considerar que podía ampliar acceso a archivos y credenciales; esa ejecución no ocurrió y se retiró la opción. La delegación nativa completó la comparación sin ese cambio.

En la asignación de documentación Sol, los metadatos iniciales todavía mencionaban Luna; se aclaró la configuración realmente solicitada sin cambiar la tarea ni los criterios. El preparador se corrigió para las asignaciones posteriores. Los materiales originales se conservaron.

## Reproducción y límites

El primer comprobador de escritorio falló por un error sintáctico del evaluador antes de ejecutar la solución: una cadena generada contenía un salto de línea literal. Se corrigió con `String.raw`, conservando los mismos casos pretendidos y archivos del modelo. La revisión resultante es `86af574fdc6d827a8746ff9def8b0614712133e3087336cc4b7a3438ab23ea87`; ambas revisiones constan en `evals/codex/models/evaluator-revisions.json`. Los seis programas generados pasaron comprobación de sintaxis. El error del evaluador no se atribuyó al modelo.

`scripts/compare-codex-models.mjs` prepara los casos y conserva los bytes iniciales. Con `--run` permite ejecutarlos por CLI cuando el entorno lo admita; no desactiva TLS ni políticas del cliente. `scripts/verify-codex-model-assignment.mjs <directorio>` ejecuta comprobaciones independientes y verifica los archivos protegidos. Las revisiones necesitan además valorar los criterios registrados; la existencia de un archivo no constituye aprobación.

Estas tareas acotadas sustentan las configuraciones iniciales de producción. No prueban adecuación universal, seguridad completa, costo efectivo ni resultados de productos reales. Los fallos futuros deben resolverse según su causa y alcance; los hooks no cambian modelos automáticamente.
