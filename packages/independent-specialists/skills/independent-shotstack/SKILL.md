---
name: independent-shotstack
description: Preparar y ejecutar montajes audiovisuales autorizados en Shotstack, consultar renders existentes y coordinar recursos de Canva y ElevenLabs. Utiliza primero la integración oficial disponible, sin instalar herramientas por rutina.
license: Apache-2.0
---

# Montaje audiovisual con Shotstack

Adaptación de la skill oficial `shotstack` 0.8.4, commit `b5992a7fd6c97ce10166346f1e5f595914b812b8`, declarada Apache 2.0. Conserva [LICENSE](LICENSE). El flujo se adaptó de comandos de terminal a la integración oficial de Codex; no se incluyen instaladores, actualizaciones automáticas ni gestión de credenciales en archivos.

## Conectar el encargo con las herramientas

Identifica el montaje solicitado, formato de salida, duración, recursos, destino y autorizaciones vigentes. Descubre las herramientas oficiales de Shotstack disponibles y lee sus esquemas antes de utilizarlas. La documentación oficial está en [MCP de Shotstack](https://shotstack.io/docs/guide/agents/mcp-server/); el servidor es `https://mcp.shotstack.io/`.

Prioriza la integración existente. No instales la interfaz de línea de comandos ni solicites claves como paso habitual. Si falta conexión, informa la intervención mínima requerida y conserva el guion o la edición preparados. No afirmes haber renderizado lo que solo está especificado.

## Preparar la edición

Antes de componer un Edit JSON, solicita la guía de Shotstack mediante `get_shotstack_guide` si está expuesta. Si no está, consulta la [referencia oficial de la API](https://shotstack.io/docs/api/) o su [esquema](https://shotstack.io/docs/api/api.edit.json) para los campos necesarios. No inventes parámetros a partir de convenciones CSS.

La fuente revisada señala estas diferencias del esquema; confirma compatibilidad con la versión activa:

| Propiedad | Convención de Shotstack |
|---|---|
| Duración del clip | `length`, no `duration` |
| Transición | `transition` con entrada y salida, no un arreglo `transitions` |
| Orden de capas | La primera pista está encima |
| Ajuste para llenar | `crop`, no el valor CSS `cover` |
| Alineación vertical central | `middle` |
| Familia tipográfica | `font.family` |

Organiza escenas y pistas con inicio, duración, recurso y propósito claros. Evita solapamientos involuntarios dentro de una pista y comprueba la relación entre audio, imágenes y subtítulos. Usa la duración real del audio disponible; identifica como estimado lo que aún no existe. Verifica sintaxis y campos antes de enviar a render, sin convertir esa comprobación en generación adicional.

Canva produce todo material gráfico y ElevenLabs la voz mediante `independent-elevenlabs`. Shotstack monta los recursos y sus transiciones. No sigas ejemplos de la fuente que creen gráficos con HTML, SVG u otros generadores como sustituto de Canva. Para rótulos y subtítulos del montaje, conserva la identidad definida y la legibilidad del formato.

## Recursos y transferencia de datos

Shotstack necesita recursos accesibles por URL; una ruta local no es un recurso remoto. Utiliza exportaciones y alojamiento autorizados. Si hace falta subir archivos y la integración no expone esa operación, comprueba la API oficial y el acceso disponible antes de pedir trabajo manual o añadir una herramienta.

Los enlaces firmados deben durar lo suficiente para que se complete la lectura y el montaje. Trátalos como datos sensibles: no los copies a registros ni documentos públicos. Nunca conviertas archivos privados en públicos para resolver un error de acceso sin autorización para esa transferencia.

Una previsualización en Studio puede transmitir la edición y producir un enlace compartible. Las operaciones `studio` o `create_studio_link`, si existen en la integración, requieren que ese envío y enlace correspondan al encargo. No las presentes como una previsualización exclusivamente local o privada.

## Consumo y estado

Consulta las condiciones actuales del servicio para la operación concreta. La fuente distingue renders de prueba con marca de agua de producción, pero la generación de recursos puede consumir créditos también en el entorno de prueba. No prometas que todo uso de `stage` es gratuito.

Antes de una operación con costo, comprueba que está cubierta por la autorización vigente y que su cantidad y configuración coinciden. Informa una estimación disponible sin inventar precios. No repitas confirmaciones rutinarias dentro de una autorización suficiente.

Envía un render una sola vez y conserva su identificador. Usa `get_render_status` o la herramienta oficial equivalente para consultar el mismo trabajo. Un timeout no prueba que el trabajo no se creó: resuelve su estado antes de volver a enviarlo. Si falló, identifica la causa y corrige solo lo necesario; no inicies reintentos pagados por rutina.

## Entrega

Informa si el resultado está preparado, enviado, en proceso, terminado o fallido según la respuesta real. Conserva identificador, estado y ubicación autorizada del resultado sin registrar credenciales ni contenido sensible. Presenta el archivo o vista disponible y menciona cualquier pendiente concreto. Al interrumpirse el encargo, guarda el identificador para continuar consultando sin volver a generar.
