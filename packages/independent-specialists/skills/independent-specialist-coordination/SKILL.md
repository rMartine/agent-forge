---
name: independent-specialist-coordination
description: Coordina los agentes del Roster de Comunicación y Formación, dedicado a marketing, marca, educación para adultos y producción audiovisual; registra las autorizaciones ya vigentes cuando sus hooks necesitan comprobar una operación externa.
---

# Coordinar el Roster de Comunicación y Formación

Usa los perfiles nativos `marketing-and-sales-specialist`, `brand-and-graphic-design-specialist`, `adult-education-specialist` y `audiovisual-production-specialist` según el trabajo solicitado. Son independientes de los equipos de investigación y desarrollo. No crees chats nuevos para una delegación; utiliza las herramientas de colaboración disponibles. Un encargo a uno de estos agentes no activa por sí mismo los equipos existentes.

Cada agente padre asigna propósito, materiales mínimos autorizados, límites y entregables a sus hijos, incluidos especialistas de otros rosters. Integra sus resultados y conserva las decisiones no delegadas. No transfieras historiales completos, credenciales ni archivos de otros proyectos.

Los agentes tienen modelos explícitos en sus perfiles. Utiliza su `agent_type` nativo y evita heredar un historial completo que sustituya su configuración de modelo. Comprueba lo que informe la herramienta; si requiere elegir modelo explícitamente, usa Astra con razonamiento alto para marketing y educación, y 6.1 Sol con razonamiento alto para marca y audiovisual. No cambies el modelo de la conversación principal.

## Registro opcional y autorizaciones vigentes

El evento nativo `SubagentStart` registra automáticamente al especialista cuando los hooks están habilitados y tienen confianza. El trabajo local reversible no requiere llenar un formulario. Para una operación externa interceptada, la principal puede registrar la autorización que Roberto ya dio; esto no exige otra confirmación por rutina. Si falta una decisión sustancial sobre datos, destino, publicación o gasto, resuélvela con Roberto antes de esa operación.

El programa está en `CODEX_HOME/independent-specialists/assignment.mjs`; si CODEX_HOME no está definido, usa `~/.codex/independent-specialists/assignment.mjs`. Ejecútalo con Node. No cambies `CODEX_THREAD_ID` para aparentar otra conversación. Se usa el identificador real de la principal y la ruta absoluta de su proyecto:

```text
node assignment.mjs status --session <sesión-principal> --project <ruta-absoluta>
node assignment.mjs open --session <sesión-principal> --project <ruta-absoluta> [--agent <identificador-devuelto>]
node assignment.mjs record --session <sesión-principal> --project <ruta-absoluta> --agent <identificador-devuelto>
node assignment.mjs close --session <sesión-principal> --project <ruta-absoluta> --agent <identificador-devuelto>
node assignment.mjs resume --session <sesión-principal> --project <ruta-absoluta> --agent <identificador-devuelto>
```

`open` lee JSON por stdin con `role`, `objective`, y opcionalmente `expectedDeliverables`, `authorizationReference` y `toolAuthorizations`. Sin `--agent` prepara una asignación; usa `--assignment ID` para identificarla y `--parent ID` para indicar un padre registrado. Con `--agent` actualiza una instancia registrada. Se permiten varias asignaciones simultáneas del mismo rol. Solo un evento con correlación explícita vincula la asignación preparada; si el cliente no aporta esa identidad, registra la autorización sobre el identificador real devuelto mediante `open --agent ID`. Un objetivo es un resumen sin datos sensibles, no el contenido del entregable.

Cada autorización contiene el nombre exacto `toolName` y, cuando permiten expresar los límites del encargo, `inputEquals` (valores escalares), `inputHashes` (SHA-256 de texto exacto sin guardar el texto), `inputOrigins` (orígenes HTTPS) o `inputMaxima` (máximos numéricos observables). Usa campos anidados mediante puntos. No registres claves, tokens, payloads completos ni enlaces firmados. `authorizationReference` debe identificar el encargo humano y sus límites sin copiar datos sensibles. No registres todas las herramientas por comodidad. Un límite numérico no equivale a comprobar el precio final ni limita el costo acumulado: conserva ese control con los datos reales del servicio y la autorización del encargo.

`record` es opcional y recibe `{ "delivered": ["nombres de entregables comprobados"] }`; no copies sus contenidos. `resume` continúa el mismo encargo interrumpido o devuelto. `close` revoca sus herramientas registradas. Un hook que señale falta de constancia no demuestra que falte un entregable: revisa la conversación y termina cuando esté completo.

Los hooks nunca conceden permisos de plataforma ni garantizan interceptar herramientas alojadas, shell, navegador o llamadas anidadas. No uses esas vías para eludir una denegación. Conserva los permisos del cliente y del conector. No prometas que este registro impide que código ejecutado bajo el mismo usuario lo modifique.

## Entrega

No generes videos, audios, campañas, cursos ni diseños para demostrar una instalación. En el uso cotidiano realiza únicamente lo encargado y las comprobaciones proporcionales. Informa resultados y conexiones pendientes; refina el comportamiento a partir de encargos reales. Las guías son gratuitas; consumir servicios requiere la autorización aplicable.
