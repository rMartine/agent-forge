---
name: consulting-process-excellence
description: "Diagnosticar procesos operativos mediante flujos, eventos y evidencia de causas. Usar para tiempos, esperas, retrabajo, errores, capacidad y diseño de mejoras o controles solicitados en consultoría."
license: MIT
metadata:
  author: "Anot; adaptación para Agent Forge"
  source-version: "2.2.0"
---

# Diagnosticar procesos y diseñar mejoras solicitadas

Explica el problema de funcionamiento y, cuando el encargo lo incluya, diseña una mejora que considere la operación completa. Usa el contexto del cliente y proyecto de `consulting-specialist-coordination` o el suministrado directamente. Un diagnóstico no añade por sí mismo un objetivo de optimización ni autoriza cambiar la operación.

## Medir el trabajo real

Establece límites, necesidad del cliente, resultado solicitado y datos disponibles. Define evento inicial y final, unidad de trabajo, casos elegibles y periodo. Explica si el tiempo incluye esperas, horas no laborables, retrabajo o casos abiertos. Distingue tiempo de trabajo efectivo de tiempo transcurrido.

Reconstruye actividades, decisiones, colas, participantes, transferencias y excepciones con evidencia. Comprueba eventos faltantes, duplicados, zonas horarias, sesgo de selección y casos incompletos antes de interpretar promedios. No inventes una línea base para completar el diagnóstico.

No atribuyas el cuello de botella al paso con mayor duración promedio sin considerar capacidad paralela, lotes, rutas y demanda. Para registros de eventos, capacidad o métodos estadísticos consulta [medición y análisis](references/measurement-and-statistics.md). El desconocimiento del desempeño no es un nivel de capacidad del proceso.

## Contrastar causas

Utiliza observaciones, datos e información atribuida para generar explicaciones comprobables. Distingue causa sospechada de causa demostrada. “Error humano” puede ocultar problemas de instrucciones, datos o controles; una causa externa puede ser real aunque el cliente no la controle.

Examina esperas, retrabajo y pasos redundantes dentro de su contexto. Antes de proponer retirar un control, identifica su finalidad y las obligaciones que cumple. Verifica efectos en etapas posteriores para no trasladar el problema a otro equipo.

Cuando se soliciten mejoras, compara efectos, costos, riesgo operativo, adopción y reversibilidad de alternativas pertinentes. Define una comprobación proporcional al cambio: referencia de comparación, criterio observable de éxito y condición para corregir o revertir. Diseñar un piloto no equivale a ejecutarlo.

## Cuantificar y entregar

Deriva efectos de volumen, tiempo, calidad y cambios de gasto identificados. Separa horas liberadas de capacidad utilizable y ahorro de efectivo. Una mayor capacidad genera ingresos adicionales solo con demanda y capacidad posterior suficientes. No cuentes las mismas horas como reducción de nómina y producción adicional simultáneamente.

Para cálculos económicos sustantivos usa `consulting-financial-modeling`. Mantén visibles resultados de servicio y riesgo cuando sean el propósito, sin forzar su monetización.

Entrega el mapa, diagnóstico, diseño de control o plan solicitado, con evidencia, incertidumbre y la condición que refutaría la explicación principal. Cuando corresponda implantar, especifica responsabilidad operativa, cambios de procedimiento, capacitación, medición y respuesta ante deterioro. Reporta por separado lo diseñado y lo observado después de ejecutarlo.

Adaptación de Management Consulting, de Anot, bajo [MIT](LICENSE). Procedencia y cambios registrados en `packages/consulting-specialist/sources.json` del repositorio.
