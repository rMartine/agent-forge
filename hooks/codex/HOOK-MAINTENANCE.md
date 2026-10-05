# Mantenimiento de hooks

## Hooks: nombres, estado y recuperación

Los nombres visibles usan `Roster de {nombre} | {ámbito} | {evento} | {acción}` en statusMessage. Los cuatro nombres son Roster de Desarrollo, Roster de Investigación, Roster de Comunicación y Formación y Roster de Consultoría. El ámbito es el agente cuando el hook es exclusivo, Especialistas cuando es compartido y Sesión para Stop, Interrupt y SessionEnd. No se cambian identificadores técnicos ni se duplican hooks para mostrar etiquetas.

Las actualizaciones reemplazan cada grupo en su posición; no mueven los grupos ajenos. Cambiar una definición puede requerir renovar su confianza en Codex. El registro del instalador debe acompañar cualquier cambio de archivos administrados; no editar solamente la copia instalada.

La resolución usa la identidad registrada del agente y su proyecto. Los subdirectorios conservan las restricciones; cambiar a otro proyecto o a un repositorio anidado requiere registrar el encargo correspondiente. Un estado corrupto produce un diagnóstico sin datos del encargo y bloquea PreToolUse para el agente propio identificado. Un agente ajeno no queda bloqueado por ese error.

Los archivos .lock no se eliminan automáticamente por antigüedad. Para recuperar uno, con los encargos detenidos, ejecutar el helper hook-storage.mjs junto a los scripts con `recover-lock RUTA_ABSOLUTA.lock`. Solo si identifica un PID terminado devolverá sha256; aplicar con `recover-lock RUTA_ABSOLUTA.lock --apply --expected SHA256`. Conserva un recibo local. Un propietario activo o desconocido impide la recuperación: conservar el archivo y revisar offline el proceso y el registro antes de una intervención manual. No borrar bloqueos en lote.
