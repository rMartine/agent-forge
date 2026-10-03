---
name: independent-elevenlabs
description: Dirigir voz y transcripción con las skills oficiales de ElevenLabs ya instaladas. Úsala para narración educativa o audiovisual autorizada, selección de voz, estimación y consulta de generaciones existentes.
---

# Voz y transcripción con ElevenLabs

Guía de coordinación creada para estos agentes. No duplica ni redistribuye las skills oficiales de ElevenLabs. Descúbrelas por su nombre y proveedor en el catálogo activo de Codex; no dependas de una ruta o versión de caché.

## Seleccionar la skill oficial

La lista siguiente es el conjunto de capacidades oficiales que utiliza esta guía:

- `creative-studio` del plugin de ElevenLabs: generar voz o transcribir directamente mediante su conector.
- `text-to-speech` del mismo proveedor: trabajar con síntesis de voz cuando el encargo requiera su API o integración en código.
- `speech-to-text` del mismo proveedor: transcripción y sus opciones pertinentes.

Lee la skill correspondiente antes de la operación y descubre las herramientas disponibles con sus esquemas. Si falta alguna, no instales un duplicado ni ejecutes instaladores de sus referencias por defecto; informa la capacidad que falta. Canva sigue siendo la herramienta para gráficos y Shotstack para montaje.

## Preparar narración

Utiliza `independent-natural-writing` y `independent-video-scriptwriting` para separar palabras habladas de instrucciones. Revisa pronunciación, abreviaturas, cifras, unidades, pausas y transiciones. Mantén un tono acorde con el propósito y evita una emoción exagerada en material educativo que necesita concentración.

Obtén identificadores de voz de la herramienta de listado o de una indicación explícita del usuario, no de memoria. Elige una voz adecuada al idioma, región y registro disponibles. Una voz de catálogo no demuestra que imite a una persona concreta. Clonar o utilizar una voz identificable requiere autorización y derechos suficientes para ese uso.

Consulta las opciones actuales del modelo y de la herramienta. Usa el modelo predeterminado de la skill oficial para narración ordinaria, y un modelo expresivo compatible cuando el encargo requiera dirección que el predeterminado no soporte. No envíes etiquetas de emoción, SSML o parámetros sin comprobar compatibilidad. En narraciones largas, usa mecanismos de continuidad soportados para evitar saltos entre fragmentos.

## Estimar y ejecutar dentro del encargo

Las generaciones consumen créditos. Cuando la herramienta admita estimación, usa `estimate_only` para conocer el costo pertinente antes de una generación que lo requiera. Mantén el número de variantes predeterminado de la skill oficial, actualmente cuatro, salvo que el usuario haya especificado otro número. Comprueba la metadata activa y refleja el número real de variantes en la estimación; no confundas una solicitud de audio con el costo de una sola variante si se producirán cuatro.

La autorización debe cubrir operación, materiales y consumo. Una autorización vigente permite completar sus pasos sin confirmar cada llamada. Si el encargo es solo escribir o preparar, no generes audio de muestra para demostrar que funciona.

Conserva `flow_id`, `node_id` y `session_ids` cuando los devuelva el conector. Consulta el estado del trabajo existente mediante la herramienta oficial. No repitas una llamada de generación para consultar progreso o resolver un timeout: podría iniciar otro trabajo y cobrarlo.

Los nodos que deban conectarse deben pertenecer al mismo flujo cuando el conector así lo requiera. Obtén identificadores de resultados reales. Adjunta únicamente los recursos autorizados y comprueba que un selector de archivos haya recibido el archivo antes de usar su nodo. No repitas ni consultes continuamente una operación mientras espera la selección del usuario.

## Transcripción y entrega

Usa el audio autorizado y conserva idioma, hablantes y tiempos cuando el encargo los necesite. Señala palabras inciertas; no inventes el contenido inaudible. Una transcripción automática requiere corrección de nombres y terminología antes de utilizarse como subtítulos finales.

Para montaje en Shotstack, entrega la ubicación autorizada, duración real y datos de sincronización disponibles. No presentes duraciones estimadas como medidas. Informa el estado real y usa la vista o archivo que la herramienta entregue. Conserva solo los identificadores necesarios para reanudar, sin copiar guiones sensibles, claves o enlaces firmados a registros generales.
