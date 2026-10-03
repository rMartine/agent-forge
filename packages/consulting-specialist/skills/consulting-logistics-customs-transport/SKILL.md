---
name: consulting-logistics-customs-transport
description: "Analizar operaciones logísticas, aduaneras y de transporte para consultoría tecnológica. Usar para reconstruir procesos, documentos, eventos, sistemas y excepciones según países, rutas y servicios del cliente."
metadata:
  author: "Agent Forge"
---

# Analizar logística, aduanas y transporte

Relaciona el problema del cliente con la operación física, los documentos, las decisiones y los sistemas que realmente participan. Usa el contexto del cliente y proyecto recibido directamente o mediante `consulting-specialist-coordination`. Los ejemplos de esta skill orientan el análisis; no constituyen un inventario de procesos del cliente ni amplían el encargo.

## Reconstruir la operación pertinente

Identifica qué servicio y decisión se analizan, qué mercancía o unidad de trabajo interviene y dónde empieza y termina la responsabilidad de cada participante. Recupera países, rutas, medios de transporte, contratos y periodo aplicable de los materiales autorizados. Una ruta internacional puede atravesar varias jurisdicciones y responsabilidades distintas.

Por ejemplo, importador, exportador, agente aduanal, transportista, operador logístico, almacén, terminal y autoridad pueden tener funciones diferentes. Confirma los participantes reales y sus obligaciones; no atribuyas propiedad de datos, autoridad o control operativo por el nombre de la empresa.

Reconstruye el flujo solicitado entre movimiento físico, evidencia documental y estado en los sistemas. Para cada paso relevante identifica evento, actor, entrada, decisión, salida y excepción. Distingue evento previsto de observado, registro tardío de demora real y documento recibido de documento revisado o aceptado. No trates el estado de una plataforma como prueba automática de lo ocurrido físicamente.

Considera identificadores y relaciones cuando afecten el problema: un pedido puede dividirse en embarques y un transporte puede consolidar varios pedidos. Confirma la relación entre bultos, contenedores, documentos, declaraciones y viajes antes de unir datos. Preserva unidades, monedas, calendarios y zonas horarias.

## Examinar documentos, datos y sistemas

Identifica fuentes utilizadas y quién registra, corrige, consulta o valida cada dato. Facturas, listas de empaque, documentos de transporte, citas, evidencia de entrega o expedientes aduaneros son ejemplos; utiliza solo los pertinentes al encargo.

Distingue información faltante, discordante, duplicada o tardía de fallas del procedimiento, integración o modelo. Una imagen ilegible requiere un tratamiento distinto de una extracción incorrecta desde una imagen legible. Conserva casos sin resolver y excepciones: no los excluyas para mostrar mejor desempeño.

Examina la interfaz real entre sistemas cuando determine la solución: por ejemplo, gestión empresarial, almacenes, transporte, intermediarios o autoridades. Confirma disponibilidad y restricciones de integración antes de proponer automatizar una consulta o transmisión. No presupongas que existe una API, acceso de escritura o autorización para operar.

Para análisis de tiempos, capacidad y causas usa `consulting-process-excellence`; conserva definiciones de caso y periodo y distingue espera, trabajo efectivo y retrabajo. Para efectos económicos usa `consulting-financial-modeling` con mecanismos sustentados.

## Tratar obligaciones aduaneras y regulatorias

Cuando una conclusión dependa de una obligación, identifica país o territorio, autoridad, régimen, mercancía, operación y fecha relevantes. Verifica el texto y su vigencia en fuentes oficiales dentro del encargo; conserva fecha de consulta y ámbito de aplicación. Diferencia norma vigente, modificación anunciada, guía interpretativa y práctica declarada por el cliente.

No proporciones como confirmado desde memoria un arancel, clasificación, permiso, plazo, sanción, retención documental u obligación de firma o presentación. Si falta información para determinar aplicabilidad, explica la condición pendiente y continúa el diseño independiente. La extracción de un código de un documento no demuestra su clasificación correcta ni su aceptación por una autoridad.

Conserva responsables humanos y facultades reales para validación y transmisión. Elaborar una recomendación o expediente de ejemplo no autoriza presentar declaraciones, cambiar datos operativos ni comunicarse con terceros.

## Entregar un diagnóstico utilizable

Explica problema, flujo pertinente, causas sustentadas o hipótesis, impacto y restricciones que condicionan una solución. Señala las discrepancias entre el procedimiento declarado y la evidencia observada sin afirmar causas no demostradas.

Relaciona una recomendación tecnológica con un cambio concreto de trabajo, responsable y criterio observable. Usa `consulting-technology-ai-solutions` cuando se solicite el diseño. La cobertura es internacional según el cliente; no asumas un país o autoridad predeterminados ni inicies una investigación sectorial general.

Instrucciones originales para Agent Forge. Procedencia registrada en `packages/consulting-specialist/sources.json` del repositorio.
