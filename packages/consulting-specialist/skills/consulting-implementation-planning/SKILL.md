---
name: consulting-implementation-planning
description: "Convertir una solución o recomendación de consultoría en un plan ejecutable. Usar para secuencia, dependencias, recursos, criterios de aceptación, despliegue o recuperación de un plan de implementación."
license: MIT
metadata:
  author: "Anot; adaptación para Agent Forge"
  source-version: "2.2.0"
---

# Planear la implementación de la solución

Produce el plan solicitado respetando dirección, financiamiento, capacidad y compromisos existentes. No repitas la estrategia ni el caso económico cuando ya estén aprobados y no exista una inconsistencia concreta. Usa el contexto vigente del cliente y proyecto, directamente o desde `consulting-specialist-coordination`.

Identifica resultado, restricciones, hitos y recursos disponibles. Explicita duración estimada, responsable propuesto y fecha todavía no acordada. Continúa las partes que no dependan de información faltante; no inventes disponibilidad o compromisos.

## Elegir y secuenciar

Si quedan abiertas decisiones de ejecución, compara enfoques viables según continuidad, capacidad, costos y reversibilidad. Una puntuación favorable no compensa una restricción obligatoria incumplida. Usa ponderaciones solo cuando representen prioridades del cliente.

Define entregables y evidencia de aceptación antes de asignar actividades. Relaciona responsabilidades e interfaces entre equipos. Considera decisiones del cliente, plazos de proveedores, disponibilidad de datos, integraciones y calendario de operación antes de fijar fechas.

Consulta [programación, recursos y recuperación](references/scheduling-and-resourcing.md) para dependencias y capacidad. Distingue esfuerzo de duración transcurrida y fecha objetivo de pronóstico viable. Conserva requisitos y entregables: no los elimines o combines para reducir el esfuerzo aparente.

Para la transición considera, donde aplique, coexistencia con sistemas actuales, capacitación, soporte y medición de resultados. Define la evidencia necesaria para avanzar y las acciones ante una falla. Usa aprobaciones reales de la operación o contrato; no crees etapas de aprobación para poder redactar el plan.

## Asignar responsabilidad

Describe quién realiza, quién responde por la entrega, quién decide y qué participación necesita el cliente. Cuando exista autoridad conjunta u obligación formal, represéntala sin ocultarla en una matriz simplificada. Conserva la forma de coordinación del cliente si está definida.

Relaciona riesgos decisivos con condición observable, responsable y respuesta. La urgencia de escalar depende de consecuencias, tiempo disponible y autoridad, sin umbrales universales inventados. Proponer un responsable no acredita su aceptación.

Si se encarga presupuesto, usa `consulting-financial-modeling` para cálculos sustantivos y diferencia estimación, fondos aprobados, gasto realizado y gasto comprometido. No añadas un porcentaje estándar de contingencia sin base.

## Comprobar y entregar

Verifica que fechas respeten dependencias, recursos no excedan disponibilidad y presupuesto concilie con el trabajo. Muestra la restricción principal y consecuencia de demora. En una recuperación conserva plan original, pronóstico actual y cambios propuestos; no borres retrasos sustituyendo silenciosamente la referencia.

Entrega la secuencia, responsabilidades y condiciones de terminación al detalle solicitado. Redactar un plan no demuestra que se hayan instalado, migrado, probado o desplegado sus componentes.

Adaptación de Management Consulting, de Anot, bajo [MIT](LICENSE). Procedencia y cambios registrados en `packages/consulting-specialist/sources.json` del repositorio.
