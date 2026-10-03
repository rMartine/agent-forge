---
name: consulting-specialist-coordination
description: Invocar y coordinar al consultor sénior de tecnología e IA para logística, aduanas y transporte, conservando el contexto por cliente y proyecto para soluciones, propuestas, respuestas y presentaciones de consultoría.
---

# Coordinar al consultor de tecnología e IA

Invoca el perfil nativo `technology-ai-logistics-consultant` cuando Roberto pida al consultor o cuando el encargo de consultoría sectorial necesite esa especialidad. Usa las herramientas de colaboración disponibles, sin crear otro chat. Pasa el encargo, las decisiones vigentes, materiales mínimos, audiencia y resultado esperado; no transfieras el historial de otros clientes. El perfil hereda modelo y permisos: no los sustituyas al invocarlo. Si la sesión todavía no descubre el perfil, informa que hace falta una sesión nueva; puedes realizar directamente el trabajo autorizado con las skills pertinentes sin afirmar que hubo delegación.

La principal conserva la asignación, coordinación, integración y entrega. El consultor puede solicitar otro especialista con una tarea concreta; no activa por sí mismo equipos de investigación o desarrollo ni autoriza una implementación. Una pregunta breve necesita una respuesta útil, no un proceso completo. No solicites confirmaciones para recuperar decisiones o autorizaciones ya dadas.

## Contexto del cliente

Para trabajo que deba persistir, usa el proyecto local de la conversación y dos identificadores derivados de los nombres proporcionados: cliente y proyecto del cliente. Conserva los identificadores existentes. No los inventes si el contexto no permite identificar al cliente; continúa la parte independiente y pregunta solo lo necesario para guardar el resultado en el lugar correcto.

El ayudante instalado está en `CODEX_HOME/consulting-specialist/assignment.mjs`; si CODEX_HOME no está definido, en `~/.codex/consulting-specialist/assignment.mjs`. Invócalo con Node antes de crear el subagente cuando ya conoces cliente y proyecto. `--session` es el identificador real de la principal y `--project` es su directorio de trabajo absoluto, el mismo que recibirá el hook:

```text
node assignment.mjs open --session IDENTIFICADOR_REAL --project RUTA_ABSOLUTA
```

El comando recibe JSON por stdin. El siguiente objeto es solo un ejemplo de estructura, no un cliente ni una autorización reales:

```json
{
  "role": "technology-ai-logistics-consultant",
  "objective": "Preparar la propuesta solicitada con la información proporcionada",
  "clientId": "cliente-indicado",
  "engagementId": "proyecto-indicado",
  "expectedDeliverables": ["Propuesta editable"]
}
```

`open` prepara una sola instancia pendiente y crea, sin sobrescribir archivos previos, el contexto en `<proyecto>/.consulting/<cliente>/<proyecto-del-cliente>/`. Contiene `context.md`, `decisions.md`, `sources.md` y `deliverables.md`. Son archivos de trabajo del cliente; no se incluyen en commits de código ni en bibliotecas generales. Lee solo los pertinentes, conserva decisiones con su fundamento y fecha, distingue propuestas y acuerdos, y enlaza fuentes realmente consultadas y entregables comprobados. No guardes claves, datos ajenos ni transcripciones completas.

`SubagentStart` vincula la instancia pendiente al identificador real del consultor. Sin registro previo, proporciona las instrucciones generales y permite responder desde el material del encargo. Para otra asignación del mismo cliente puedes reanudar al especialista si corresponde; para cambiar de cliente o proyecto crea uno nuevo y pasa solo su contexto. Una conversación antigua conserva lo que leyó: cambiar un identificador no la aísla.

## Límites explícitos y comprobaciones

El registro no concede autorizaciones. Los hooks no exigen listas de herramientas aprobadas para tareas ordinarias. Si el encargo establece un límite que una herramienta permite comprobar, registra `authorizationReference` como referencia breve a esa instrucción y `toolConstraints` para el nombre exacto de herramienta. Cada entrada admite `deny: true` para una prohibición explícita, o condiciones `inputEquals`, `inputHashes`, `inputOrigins` e `inputMaxima`. Sus claves identifican campos de argumentos con puntos para campos anidados. No guardes credenciales ni contenido sensible: `inputHashes` conserva SHA-256 del texto exacto, no el texto.

Un límite numérico comprueba un argumento, no el gasto acumulado. Un origen HTTPS comprueba el destino observable, no la confidencialidad del contenido. No marques como autorizada una acción por existir un registro, ni uses herramientas alternativas para eludir una denegación. Las herramientas alojadas y rutas no observadas siguen requiriendo el criterio del agente y los permisos nativos. Un campo no observable produce una advertencia; no acredita cumplimiento.

La principal puede actualizar la asignación con `open --agent IDENTIFICADOR_REAL` sin cambiar su cliente. `status` consulta el registro; `record --agent IDENTIFICADOR_REAL` recibe por stdin `{"delivered":["nombre del entregable comprobado"]}`; `close --agent IDENTIFICADOR_REAL` cierra; `resume --agent IDENTIFICADOR_REAL` reanuda una asignación devuelta o interrumpida cuando una instrucción vigente lo autoriza. Estos comandos usan los mismos `--session` y `--project`. No cambies variables de entorno para aparentar otra sesión. Registrar entregas es opcional; la ausencia de registro no invalida trabajo presente en la conversación.

## Entrega

Integra el resultado real, comprueba los archivos y cálculos pertinentes, conserva limitaciones y devuelve a Roberto lo solicitado. La revisión de los hooks no demuestra verdad ni suficiencia de evidencia. No produzcas otros materiales, repitas pruebas o fuerces una continuación para completar un registro.
