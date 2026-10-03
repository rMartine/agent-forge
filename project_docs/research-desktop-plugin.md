# Equipo de investigación de Agent Forge para Codex Desktop

El paquete `agent-forge-research` contiene una dirección, veinte definiciones de especialistas, doce skills propias, nueve skills externas adaptadas y siete hooks. Se instala como plugin local en esta workstation. No exporta agentes científicos a VS Code ni escribe skills independientes en las carpetas compartidas. El equipo de desarrollo existente conserva sus archivos y modelos.

## Responsabilidades y modelos

El catálogo verificable es [research-roster.json](../plugins/agent-forge-research/research-roster.json). Contiene responsabilidad, archivo del rol, skills, evidencia de cierre y modelo explícito para cada especialista. La dirección utiliza `gpt-6-astra` con razonamiento `high`; se selecciona en el chat correspondiente y no modifica el modelo global.

La distribución completa de los veinte especialistas es:

| Modelo y razonamiento | Especialistas |
|---|---|
| `gpt-6.1-sol`, `high` | Búsqueda bibliográfica; reproducibilidad computacional; figuras científicas. |
| `gpt-6.1-sol`, `medium` | Referencias bibliográficas. |
| `gpt-6-astra`, `medium` | Escritura científica. |
| `gpt-6-astra`, `high` | Síntesis de evidencia; diseño experimental; estudios con participantes; análisis estadístico; respuestas a revisores; revisión científica independiente; aprendizaje automático y profundo; modelos de lenguaje y sistemas con agentes; visión por computadora y percepción multimodal; interacción entre personas e inteligencia artificial; realidad extendida; inteligencia artificial para sistemas físicos; modelado matemático y simulaciones; matemáticas; robótica. |

La elección de modelos procede del plan aprobado; no constituye una comparación experimental de rendimiento. La dirección crea subagentes reales con `spawn_agent`, contexto nuevo, instrucciones del rol y modelo/razonamiento explícitos. No mantiene veinte chats permanentes. Respeta la concurrencia disponible y conserva las decisiones científicas no delegadas por Roberto.

## Procedencia de las skills

Las seis skills de K-Dense proceden del commit `154988403bb5a18e9d3c0ce4e6d5e2e4b184a298`; `nature-writing`, `nature-response` y `nature-shared` proceden del commit `84880815fb37317b3766bff2c2abba395b8993c3`. Se conservan recursos y licencias. [El inventario de procedencia](../plugins/agent-forge-research/provenance/external-sources.json) registra hashes originales y adaptados de cada archivo; [el registro de adaptaciones](../plugins/agent-forge-research/provenance/ADAPTATIONS.md) explica las diferencias y sus límites.

Zotero, Jupyter y `digital-twin-researcher` se referencian como capacidades existentes y se usan únicamente cuando correspondan al encargo. No se instalaron copias de ellas en ubicaciones compartidas. Los documentos LaTeX independientes usan el editor y compilador integrados de Desktop; los proyectos de varios archivos requieren el entorno autorizado del proyecto.

## Autorización y operaciones externas

[La política de operaciones científicas](../plugins/agent-forge-research/references/authorization-policy.md) registra las autorizaciones existentes. Crear ese registro no concede permisos. Los programas auxiliares comprueban rutas, destinos, modelos externos, credenciales, tamaños y límites declarados. Las actualizaciones se preparan como versiones nuevas con cambios revisados; no se incluye el instalador/actualizador remoto original.

OpenRouter permanece disponible. La clave se obtiene de una variable o archivo expresamente autorizado y se utiliza para autenticación, separada del contenido enviado al modelo. El generador exige identificadores explícitos para el modelo de imágenes y el modelo que revisa la imagen; son distintos del modelo del especialista. No busca `.env` en carpetas superiores. No repite automáticamente una operación incierta que pueda haber sido cobrada.

Los límites monetarios se coordinan mediante reservas atómicas compartidas por archivo de autorización. Son máximos declarados por solicitud, no facturación observada. Solo permiten afirmar un límite de gasto efectivo cuando esos máximos son defendibles o existe un límite aplicado por el proveedor. Los permisos del entorno y las instrucciones de Roberto siguen vigentes.

La revisión estática, los hashes y las pruebas reducen riesgos identificados; no garantizan seguridad absoluta. El inventario detecta diferencias respecto de la versión preparada, pero no es una firma de un editor externo ni impide que quien controla el equipo modifique código e inventario. El revisor científico tiene instrucciones de solo lectura y restricciones en herramientas cubiertas; no dispone por ello de un aislamiento completo del sistema operativo.

## Hooks y registros

El archivo [hooks.json](../plugins/agent-forge-research/hooks/hooks.json) declara exactamente `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt` y `SessionEnd`. Los hooks de desarrollo permanecen separados.

Los registros distinguen proyecto, chat, asignación y subagente. La dirección prepara una asignación; la creación se comprueba antes de ejecutarse y los eventos posteriores la relacionan con el identificador observado. No se identifica a un investigador solo por ser un agente `default`. La discrepancia de modelo impide aceptar su trabajo como completado. El razonamiento solicitado se registra; los eventos disponibles no prueban por sí solos el razonamiento efectivo.

Los hooks registran como máximo cien metadatos de operaciones cubiertas por asignación, sin argumentos ni respuestas. El cierre admite como máximo una continuación de la dirección para completar evidencia; el revisor puede terminar sin escribir registros. Interrumpir no reanuda tareas. El procedimiento completo está en [la referencia de ejecución](../plugins/agent-forge-research/skills/direct-research/references/runtime.md).

La cobertura de herramientas es parcial. Un hook que no recibe los comandos internos de `functions.exec` no puede comprobarlos. Los controles de red y archivos también residen en los programas auxiliares. Ni un evento satisfactorio ni un registro completo acreditan la calidad científica de una conclusión.

## Preparación e instalación local

Desde la raíz de Agent Forge, ejecutar las siguientes operaciones con rutas absolutas del entorno autorizado:

```powershell
npm run build
npm run test:research -- --python '<Python de validación con dependencias fijadas>'
node scripts/research-plugin.mjs prepare '<carpeta nueva del catálogo local>' --python '<Python del entorno científico>' --data-root '<carpeta absoluta de registros fuera del proyecto>'
node scripts/research-plugin.mjs verify '<carpeta nueva del catálogo local>/plugins/agent-forge-research'
codex plugin marketplace add '<carpeta nueva del catálogo local>' --json
codex plugin add agent-forge-research@agent-forge-research-local --json
```

El comando de preparación rechaza un destino no vacío. El entorno científico se instala mediante [versiones y hashes fijados para Python 3.12 en Windows](../plugins/agent-forge-research/provenance/runtime-windows-python312.lock.txt). El paquete registra la ruta del intérprete y una ubicación común de registros en `runtime.json`, incluye su inventario y conserva los catálogos existentes. La dirección y los hooks usan esa misma ubicación aunque tengan variables de entorno diferentes. No cambia el modelo global ni inicia servicios remotos.

Desktop requiere revisar la confianza de los hooks del plugin; instalarlo no concede esa confianza. Esta comprobación del cliente se respeta sin modificar manualmente sus registros de confianza. Véanse la [documentación oficial del paquete](https://developers.openai.com/plugins/build/plugins) y [los eventos de hooks](https://learn.chatgpt.com/docs/hooks).

## Código disponible al clonar Agent Forge

Las definiciones, modelos, skills, hooks y programas auxiliares se versionan dentro de `plugins/agent-forge-research`; la preparación e instalación se documentan en este repositorio. Un clon que incluya esos commits contiene el código necesario para preparar otra instalación. Un clon remoto no incluye commits que solo existen localmente.

Clonar no instala el equipo ni copia su confianza. En otra workstation se deben preparar rutas locales y el entorno Python, construir una versión con su inventario, instalarla mediante Codex Desktop y revisar los hooks en ese cliente. Las rutas absolutas del entorno preparado, los registros de ejecución, las credenciales y las autorizaciones de Roberto no se transfieren como parte del repositorio. La instalación y validación encargadas se limitaron a esta workstation; no se afirma funcionamiento verificado en otros equipos.

## Recuperación

Para retirar exclusivamente este plugin, usar la operación nativa:

```powershell
codex plugin remove agent-forge-research@agent-forge-research-local --json
```

La retirada desactiva sus capacidades para nuevas cargas. No borra manuscritos, datos, registros científicos, el entorno Python ni otros agentes/plugins. El catálogo local y su versión preparada se conservan para una reinstalación revisable. No eliminar carpetas compartidas ni restaurar una configuración global anterior que pueda perder cambios ajenos. Una actualización debe conservar esta posibilidad de volver a la versión preparada previa.

## Evidencia de verificación

El informe de instalación de esta workstation documenta por separado las pruebas del paquete, las operaciones del cliente nativo y los eventos realmente observados en Desktop. Las pruebas locales usan materiales controlados; no recopilan un corpus ni realizan estudios con participantes o hardware. Las respuestas HTTP simuladas no acreditan una llamada real de OpenRouter, y no se ha autorizado una llamada pagada para esta validación.

La compilación general de Agent Forge pasó durante la implementación. La batería general encontró tres fallos de correspondencia de `handoffs` en el catálogo de desarrollo de la base `cf76a73`, en archivos no modificados por este trabajo; no se corrigieron mezclando cambios ajenos al plugin. El informe final conserva esos fallos separados de las pruebas específicas del equipo de investigación.
