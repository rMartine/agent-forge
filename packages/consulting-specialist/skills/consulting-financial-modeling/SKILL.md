---
name: consulting-financial-modeling
description: "Construir o revisar cálculos económicos y modelos financieros de soluciones tecnológicas. Usar para costos, beneficios, flujos de efectivo, comprar frente a desarrollar, sensibilidad y criterios de inversión del encargo."
license: MIT
metadata:
  author: "Anot; adaptación para Agent Forge"
  source-version: "2.2.0"
---

# Sustentar decisiones con cálculos económicos

Construye el cálculo o archivo solicitado al nivel necesario para la decisión. Conserva supuestos, horizonte y convenciones proporcionados; señala inconsistencias materiales sin reemplazarlos silenciosamente. Usa el contexto del cliente y proyecto suministrado directamente o mediante `consulting-specialist-coordination`.

## Establecer bases comparables

Identifica moneda, unidades, fecha de valoración, periodo, momento de flujos y alternativa de referencia. Considera inflación, impuestos, financiamiento, capital de trabajo y valor final cuando afecten el encargo. No añadas valoración empresarial a una comparación sencilla de costos.

Separa datos históricos, pronósticos del cliente, estimaciones con fuente y valores pendientes. Para un dato faltante usa una fórmula, rango sustentado o supuesto explícito; no presentes un ejemplo hipotético como estimación del cliente. Mantén una fuente única por supuesto y su unidad, periodo y limitación, en un registro cuando el tamaño del modelo lo justifique.

## Modelar el efecto incremental

Calcula cambios respecto del funcionamiento de referencia. Separa tiempo liberado, capacidad utilizable, gasto evitado y producción adicional. Incluye la adopción gradual, revisión humana y retrabajo que afecten los beneficios. No dupliques un resultado entre productividad, reducción de personal e ingresos.

Consulta [convenciones de efectivo y rendimientos](references/cash-flow-conventions.md) para fórmulas; [costos de tecnología e IA](references/technology-and-tco.md) para integración, automatización y operación; y [escenarios y valoración](references/valuation-and-risk.md) solo cuando el encargo necesite esos métodos.

Calcula cantidades materiales con herramientas disponibles y muestra fórmulas e intermedios suficientes para reproducirlas. En hojas de cálculo, vincula resultados con entradas, separa supuestos y fórmulas y conserva unidades y periodos. Usa la skill de hojas de cálculo disponible para producir y revisar el archivo; informa si no se pudieron recalcular sus fórmulas.

## Probar la decisión

Evalúa la disponibilidad de efectivo por separado del rendimiento: una inversión rentable puede exigir pagos antes de recibir beneficios. No asumas financiamiento sin compromiso confirmado.

Varía los supuestos capaces de cambiar la recomendación y calcula el umbral donde cambia la elección. Los rangos deben corresponder a incertidumbres plausibles, sin porcentajes genéricos ni probabilidades inventadas. Conserva discrepancias entre fuentes y muestra su efecto; no ocultes falta de información elevando arbitrariamente una tasa de descuento.

## Entregar y verificar

Explica decisión, inversión, resultado, necesidad de financiamiento y principal limitación. Conserva en Roberto la aprobación de precios, compromisos y decisiones empresariales no delegadas.

Comprueba signos, unidades, tiempos, sumas, tratamiento de la referencia, duplicación de costos o beneficios y dirección de la sensibilidad. Entrega el archivo funcional si fue solicitado y cómo cambiar sus supuestos. Identifica lo efectivamente verificado sin afirmar auditoría independiente.

Adaptación de Management Consulting, de Anot, bajo [MIT](LICENSE). Procedencia y cambios registrados en `packages/consulting-specialist/sources.json` del repositorio.
