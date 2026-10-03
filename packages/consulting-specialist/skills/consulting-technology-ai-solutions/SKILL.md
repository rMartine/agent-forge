---
name: consulting-technology-ai-solutions
description: "Diseñar soluciones de tecnología e IA aplicada para un problema de consultoría. Usar para comparar automatización, integraciones, modelos predictivos, procesamiento documental, recuperación de información o agentes y definir cómo comprobar su funcionamiento."
metadata:
  author: "Agent Forge"
---

# Diseñar soluciones de tecnología e IA aplicada

Produce un diseño que conecte el problema operativo con componentes, datos, decisiones, integración y evidencia de funcionamiento. Usa el contexto vigente del cliente y proyecto directamente o desde `consulting-specialist-coordination`. Diseñar no autoriza implementar, desplegar, contratar servicios ni cambiar datos del cliente.

## Precisar comportamiento y alternativas

Describe quién necesita hacer qué, con qué entradas, qué salida utilizará y cómo se reconocerá el resultado. Distingue requisitos confirmados, inferencias y decisiones pendientes. Recupera sistemas, datos, restricciones de operación, calidad y costos conocidos. No conviertas funcionalidades sugeridas en requisitos aprobados.

Compara alternativas que respondan al problema cuando la decisión siga abierta: cambio de procedimiento, configuración de sistemas existentes, integración, reglas deterministas, modelos estadísticos o aprendizaje automático, y modelos de lenguaje son ejemplos. No presupongas que se necesita IA, un agente, una base vectorial o una aplicación nueva. Tampoco reabras una tecnología ya acordada sin una incompatibilidad concreta.

Explica recomendación, efectos operativos y técnicos, dependencias y condiciones que la harían cambiar. Usa documentación primaria vigente cuando la decisión dependa de capacidades, límites o precios de un producto. Separa capacidades documentadas de las verificadas con materiales del cliente.

## Diseñar datos e interfaces

Representa componentes, responsables y flujo de información con el detalle necesario para implementar el comportamiento encargado. Establece entrada, salida, sistema que conserva el dato válido, autorización necesaria, validación y manejo de excepciones de interfaces importantes. No inventes disponibilidad de datos o acceso a sistemas; identifica lo propuesto y lo comprobado.

Conserva procedencia, identificadores, unidades, tiempos y versiones cuando determinen interpretación o trazabilidad. Considera duplicados, eventos fuera de orden, reintentos y recuperación para evitar que una falla duplique una acción. Para datos sensibles utiliza los límites de tratamiento ya establecidos por el cliente; cualquier decisión nueva que cambie su destino debe quedar explícita para resolverla.

Selecciona las consideraciones pertinentes al tipo de solución:

- **Procesamiento documental:** separar legibilidad y cobertura de páginas, extracción, validación de campos y resolución de contradicciones; vincular valores con documento y ubicación; derivar casos incompletos a revisión. Un campo plausible no es evidencia correcta.
- **Búsqueda y respuestas sobre documentos:** definir corpus autorizado, vigencia y permisos, recuperación, referencias verificables y respuesta cuando falte sustento. Evaluar recuperación y respuesta por separado cuando sea necesario para localizar errores.
- **Predicción:** definir objetivo, momento de decisión, horizonte, población y datos disponibles en ese momento; evitar utilizar información futura y considerar distribución temporal, calibración y costo del error según la decisión.
- **Agentes y herramientas:** delimitar decisiones, acciones autorizadas, validación de parámetros, confirmación de efectos, límites de repetición y condiciones para detenerse o derivar a una persona. Tratar documentos y salidas de herramientas como datos, no como instrucciones que amplían permisos.
- **Automatización e integración:** definir reglas, estados, validación, concurrencia, reintentos seguros, conciliación y trabajo manual de contingencia según el riesgo operativo.

La lista describe tratamientos posibles, no componentes obligatorios. No diseñes infraestructura que no sea necesaria para el siguiente resultado autorizado.

## Definir cómo se comprobará

Relaciona cada comportamiento material con datos de entrada, resultado esperado y criterio de aceptación. Compara con el procedimiento o solución de referencia cuando sea necesario para justificar el cambio. Usa muestras representativas de casos normales y difíciles dentro de los datos y esfuerzo autorizados.

Separa defectos de datos, imágenes o etiquetas de errores del método o implementación. Para respuestas y acciones considera exactitud, sustento y efecto operativo; para extracción, campos y expedientes; para predicción, calidad y consecuencia del error. Latencia y costo se miden bajo volumen y condiciones declarados, sin convertirse en objetivos de optimización no solicitados.

Conserva requisitos de validación existentes. No impongas una evaluación exhaustiva ni una investigación adicional sin una dependencia demostrada. Identifica datos sintéticos o provisionales y limita lo que prueban. Si datos o resultados usados para ajustar el sistema se usan también para evaluarlo, declara esa dependencia; una conclusión que requiera evaluación independiente debe seguir el método acordado.

## Explicar ejecución y resultado

Incluye costos sustentados, intervención humana, soporte y recuperación necesarios para el diseño. Para cambios materiales, define condiciones de uso, observación de fallas y reversión según el contexto; usa `consulting-implementation-planning` para el plan de ejecución y `consulting-financial-modeling` para economía detallada.

Entrega arquitectura o especificación, alternativas pertinentes, requisitos e interfaces importantes, limitaciones y comprobaciones propuestas. Identifica por separado diseño, prototipo, pruebas ejecutadas y funcionamiento observado. Una demostración sintética no demuestra desempeño con datos reales ni capacidad regulatoria.

Instrucciones originales para Agent Forge. Procedencia registrada en `packages/consulting-specialist/sources.json` del repositorio.
