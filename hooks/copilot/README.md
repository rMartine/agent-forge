# Hooks de los cuatro rosters en Copilot

`adapter.mjs` normaliza únicamente los campos reales del cliente y llama la lógica original de los cuatro rosters con almacenamiento separado. `coverage.json` declara el contrato del motor seleccionado. Se instala un solo `agent-forge-rosters.json`; los perfiles Copilot y Local no se activan juntos.

El contexto de `SessionStart` proporciona el ID real de sesión y la ruta del proyecto. Observarlos no activa ningún encargo. Los coordinadores usan siempre el auxiliar instalado:

```text
node RUNTIME/hooks/session.mjs development activate --session ID_REAL --project RUTA_ABSOLUTA --objective OBJETIVO
node RUNTIME/hooks/session.mjs research start --session ID_REAL --project RUTA_ABSOLUTA --input-file AUTORIZACION_JSON
node RUNTIME/hooks/session.mjs communication open --session ID_REAL --project RUTA_ABSOLUTA
node RUNTIME/hooks/session.mjs consulting open --session ID_REAL --project RUTA_ABSOLUTA
```

`communication open` y `consulting open` leen el JSON completo del encargo por stdin, como sus módulos originales. Para Investigación, `assign`, `evidence`, `status` y `spawn-input` conservan los parámetros originales. `spawn-input` devuelve `agentName` y `prompt` para la delegación nativa; el prompt conserva íntegra la asignación preparada. No ejecutar directamente los módulos de sesión originales: sus defaults pertenecen al cliente fuente. El auxiliar fuerza las opciones de almacenamiento y las variables de compatibilidad únicamente en memoria dentro del proceso de Copilot.

Copilot no proporciona un ID de instancia en `subagentStart`. El coordinador puede consultar los IDs reales ya observados con `session.mjs research observations --session ID_REAL --project RUTA_ABSOLUTA` (también admite los otros rosters). Esta consulta solo muestra identidad, rol y evento, sin contenido de los encargos. Si el host proporciona el ID más tarde, el coordinador puede vincular explícitamente el encargo mediante:

```text
node RUNTIME/hooks/session.mjs research bind --session ID_REAL --project RUTA_ABSOLUTA --agent ID_OBSERVADO --assignment ASIGNACION
node RUNTIME/hooks/session.mjs communication bind --session ID_REAL --project RUTA_ABSOLUTA --agent ID_OBSERVADO
```

`bind` también admite Desarrollo y Consultoría. Solo acepta un ID observado por un hook de esta sesión y proyecto, con el mismo rol que el encargo preparado. No convierte el nombre del rol en un ID. Investigación exige la asignación concreta; Desarrollo exige un encargo activo. Si no existe un ID observable, devuelve evidencia al coordinador y declara la limitación, sin inventar una vinculación. El coordinador registra la evidencia de los especialistas.

Para cualquier roster, `suspend` y `end` requieren únicamente `--session` y `--project`. Permiten suspender o cerrar explícitamente cuando el motor no entrega un evento equivalente. `Stop` conserva el significado de fin de turno: los handlers pueden cerrar el encargo, pero no se fabrica un fin de conversación. Las solicitudes de continuación de los rosters se agregan y limitan a una por sesión observada.

Los eventos de herramienta sin identidad explícita de actor no se atribuyen a un especialista. Los controles de autorización se conservan en los handlers fuente y se ejecutan cuando el cliente entrega esa identidad; nunca conceden un `allow` que sustituya los permisos del cliente. Los registros de resultados requieren además un ID real de la operación. Ni el navegador ni comandos anidados se consideran interceptados de forma completa.

La recuperación de bloqueos usa `development/hook-storage.mjs recover-lock RUTA_ABSOLUTA.lock` para obtener el hash de un propietario muerto comprobable y `--apply --expected HASH` para recuperar conservando recibo. Los bloqueos vivos o de propietario desconocido se preservan. No ejecutar recuperación automática. Los registros contienen IDs y metadatos mínimos, nunca prompts, respuestas completas, credenciales ni archivos de investigación.

La instalación y estos adaptadores solo se comprueban estáticamente; no se ejecutan conversaciones, llamadas a modelos ni pruebas funcionales.
