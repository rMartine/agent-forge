---
name: consulting-strategic-analysis
description: "Estructurar decisiones de consultoría tecnológica, contrastar causas y comparar alternativas con evidencia. Usar para diagnóstico, estrategia, modelos de negocio, posicionamiento o evaluación de recomendaciones."
license: MIT
metadata:
  author: "Anot; adaptación para Agent Forge"
  source-version: "2.2.0"
---

# Analizar decisiones estratégicas

Produce una recomendación que Roberto pueda utilizar y un razonamiento que pueda revisar con el cliente. Parte del avance existente: formular la pregunta, diagnosticar una causa, comparar opciones o cuestionar una recomendación. Retoma el contexto del cliente y proyecto proporcionado por `consulting-specialist-coordination`; esta skill también puede usarse con el contexto explícito del encargo.

## Definir la decisión

Recupera del material disponible quién decide, qué resultado busca, horizonte, restricciones y audiencia del entregable. Distingue restricciones obligatorias de preferencias negociables. Descarta una alternativa inviable antes de asignarle una puntuación favorable por otras características.

Resuelve lo que permite la evidencia. Explicita un supuesto o una recomendación condicional cuando sea suficiente; pregunta solo por un dato que cambie una decisión importante y que no pueda recuperarse. Un borrador no requiere un diagnóstico nuevo completo. Identifica los ejemplos hipotéticos donde se utilicen.

## Diagnosticar y comparar

Descompón el problema según su mecanismo operativo o económico. Define unidades y evita sumar categorías superpuestas. Por ejemplo, separar volumen, precio y mezcla de servicios puede explicar un cambio de margen mejor que llenar una matriz estratégica.

Para una explicación que pueda cambiar la decisión, identifica la evidencia favorable, la contraria, lo que falta comprobar y qué acción se seguiría si fuera cierta. Una asociación o una opinión repetida no demuestra una causa. Propón comprobaciones concretas dentro del alcance; la recomendación de investigar no autoriza entrevistas, experimentos ni recopilaciones adicionales.

Cuando la elección siga abierta, compara alternativas materialmente distintas sobre el mismo alcance, periodo, costos, capacidad de ejecución y prioridades del cliente. Incluye mantener el funcionamiento actual o aplazar cuando sean alternativas pertinentes. No reabras una decisión aprobada para completar una tabla.

Para elegir un método analítico consulta [métodos estratégicos](references/strategic-methods.md). Para dimensionar una oportunidad o comparar competidores consulta [mercados y competencia](references/market-and-competition.md). Aplica únicamente el método que aporte una distinción útil; dos marcos alimentados por la misma información no constituyen corroboración independiente.

## Sostener la recomendación

Vincula las afirmaciones decisivas con archivos, cálculos, declaraciones atribuidas o fuentes externas. Conserva fecha, población, definición y límites cuando afecten la comparación. Separa resultados observados, declaraciones del cliente, estimaciones y pronósticos. Verifica información externa cambiante con fuentes primarias dentro del encargo.

Conserva contradicciones entre fuentes y explica si proceden de periodos, poblaciones o definiciones distintos. No promedies estimaciones incompatibles ni conviertas referencias sectoriales en metas aprobadas.

Entrega primero la recomendación o la condición que impide decidir. Explica evidencia, consecuencias, alternativa mejor sustentada, desventaja aceptada y qué información cambiaría la conclusión. Identifica responsables y fechas propuestos como propuestas. Detén el análisis al responder el encargo y sus condiciones de aceptación, sin añadir una investigación de mayor alcance.

Adaptación de Management Consulting, de Anot, bajo [MIT](LICENSE). La fuente, commit y cambios están registrados en `packages/consulting-specialist/sources.json` del repositorio.
