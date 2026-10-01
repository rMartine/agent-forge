# Aplicación de las recomendaciones sobre reglas de trabajo de Agent Forge

Fecha: 1 de octubre de 2026.

Se aplicaron las catorce sustituciones y las dos eliminaciones autorizadas. Las otras veintitrés unidades conservaron su texto. No quedaron ubicaciones pendientes. Este documento registra la aplicación; no añade instrucciones de trabajo.

La referencia es el [informe de revisión](D:/Repositorios/agent-forge/project_docs/audits/revision-de-reglas-de-trabajo.md), conservado íntegro. Los textos nuevos se tomaron completos de ese informe, en español, sin una nueva redacción. Se mantuvieron las viñetas necesarias para conservar el formato de cada documento.

## Resultado por regla

La tabla contiene todas las modificaciones y eliminaciones de este encargo. Los enlaces de las unidades eliminadas apuntan al archivo del que se retiraron.

| Regla | Modificación realizada | Ubicación | Pendientes |
|---|---|---|---|
| 1223 | Se sustituyó la prohibición general de la ruta por la restricción de copias adicionales que el entorno cargaría como los mismos agentes. El texto permite representar la ruta en material temporal necesario para el encargo. | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:8) | Ninguno. |
| 1224 | Se distinguieron las copias adicionales que se cargarían en el entorno real de las representaciones temporales necesarias. Los dos párrafos relacionados identificados para conservación permanecen intactos. | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:9) | Ninguno. |
| 1225 | Se conservó la coherencia de las operaciones compartidas y se permitió decidir responsabilidades propias de cada interfaz y reorganizaciones necesarias dentro del encargo. | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:10) | Ninguno. |
| 1229 | Se distinguieron autorización vigente, identificador de la operación e interacción exigida por la herramienta. Una autorización suficiente no debe solicitarse de nuevo. | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:13) | Ninguno. |
| 1230 | Se eliminó la línea que exigía compilación, pruebas, validación del conjunto de agentes y revisión de cambios preparados antes de cualquier commit. No se añadió sustituto local. | [.github/copilot-instructions.md](D:/Repositorios/agent-forge/.github/copilot-instructions.md:1) | Ninguno. |
| 2209 | Se actualizó la convención sobre componentes para permitir las decisiones técnicas previstas en 1225 sin mantener una distribución inamovible de responsabilidades. | [project_docs/knowledge/repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:7) | Ninguno. |
| 2214 | Se eliminó la formulación local incompleta sobre ramas y commits. Las obligaciones globales de Git permanecen vigentes. | [project_docs/knowledge/repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:1) | Ninguno. |
| 2215 | Se mantuvieron los comandos de dependencias, compilación y pruebas, indicando que su ejecución depende del cambio y de las condiciones vigentes de su fase. | [project_docs/knowledge/repo-conventions.md](D:/Repositorios/agent-forge/project_docs/knowledge/repo-conventions.md:12) | Ninguno. |
| 2216 | Se actualizaron las dos apariciones de la secuencia documentada, conservando los cinco comandos completos y retirando su interpretación como preparación obligatoria para toda edición o commit. | [README.md](D:/Repositorios/agent-forge/README.md:18); [project_docs/requirements/build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:14) | Ninguno. |
| 2219 | Se separaron preparación, aplicación autorizada y comprobaciones posteriores. Se conservaron los siete pasos y las cantidades originales: 24 agentes Copilot, 16 agentes Codex y cinco paquetes Codex con prefijo. | [project_docs/requirements/build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:62) | Ninguno. |
| 2220 | Se indicó comprobar si la autorización expresa vigente ya cubre la acción, sus efectos y su destino, y solicitar únicamente la autorización que falte. | [project_docs/requirements/build-and-install.md](D:/Repositorios/agent-forge/project_docs/requirements/build-and-install.md:74) | Ninguno. |
| 2222 | Se sustituyó la condición general imprecisa de aprobación por la redacción aprobada sobre acciones con efectos externos y autorización vigente, sin alterar permisos de la plataforma. | [project_docs/architecture/architecture.md](D:/Repositorios/agent-forge/project_docs/architecture/architecture.md:89) | Ninguno. |
| 2224 | Se conservaron los identificadores y el protocolo documentado, distinguiéndolos de una nueva solicitud de autorización humana. | [project_docs/requirements/core-lifecycle.md](D:/Repositorios/agent-forge/project_docs/requirements/core-lifecycle.md:47) | Ninguno. |
| 2226 | Se sustituyó únicamente el paso 4 del procedimiento: comprobar autorización para cada proveedor y solicitarla sólo cuando falte. Los otros pasos permanecen intactos. | [project_docs/requirements/mcp-tool-management.md](D:/Repositorios/agent-forge/project_docs/requirements/mcp-tool-management.md:14) | Ninguno. |
| 2228 | Se explicitó que la prohibición de modificarse autónomamente corresponde al programa y no impide el mantenimiento encargado al asistente. | [project_docs/requirements/non-functional.md](D:/Repositorios/agent-forge/project_docs/requirements/non-functional.md:11) | Ninguno. |
| 2232 | Se mantuvo la descripción de operaciones compartidas y se permitió resolver responsabilidades de cada interfaz dentro del encargo autorizado. | [project_docs/requirements/extension-and-cli.md](D:/Repositorios/agent-forge/project_docs/requirements/extension-and-cli.md:3) | Ninguno. |

## Contenido conservado y revisión documental

Se conservaron íntegramente las unidades 1220, 1221, 1222, 1226, 1228, 2205, 2206, 2207, 2208, 2210, 2211, 2212, 2213, 2217, 2218, 2221, 2223, 2225, 2227, 2229, 2230, 2231, 2233. También permanecieron intactos los dos párrafos relacionados con 1224 que el informe identifica en arquitectura y creación de carpetas del repositorio.

La comparación del contenido anterior y posterior confirmó que los nueve documentos afectados contienen únicamente las sustituciones y eliminaciones previstas. Las dos apariciones de 2216 mantienen los cinco comandos; 2219 mantiene los siete pasos y las cantidades originales. Conservar esas cantidades no constituye una nueva evaluación de su vigencia.

El redactor técnico, con GPT-6.1 Sol y razonamiento alto, aplicó los cambios. El arquitecto de software, con GPT-6 Astra y razonamiento alto, examinó las diferencias en lectura y no encontró observaciones que corregir. El coordinador contrastó los archivos con los originales y las propuestas completas y preparó exclusivamente los cambios del encargo para su registro local.

Se revisó por lectura la distinción entre un cambio documental, una decisión técnica de arquitectura, una operación ya autorizada y un lanzamiento. No se ejecutaron esos escenarios, compilaciones, pruebas, instalaciones ni despliegues. El acuerdo versión 7, las instrucciones globales y el informe de revisión conservan su contenido.

Los cambios se limitan a documentos: no se modificaron código, agentes producidos, guías producidas, modelos, configuración de delegación, generadores ni instalaciones. Tampoco se configuró la carga de instrucciones en Codex o VS Code. La actualización de los archivos no demuestra que los chats abiertos hayan recibido sus textos nuevos.

## Recuperación y registro local

El punto de partida fue `development`, commit `bbca5eb9598c258484d2332801a4d31a3a68d697`, sin modificaciones locales. Los cambios se prepararon en `codex/apply-agent-forge-work-rules` para su integración local en `development` conservando el historial. No se publicaron cambios remotos.

El [registro del respaldo](<D:/Proyectos/Codex setup and customization/.migration-private/agent-forge-rule-application-20261001/backup-manifest.json>) identifica las rutas originales, los archivos recuperables y sus hashes. Las copias de los documentos están en la subcarpeta `before` de ese respaldo, fuera de las instrucciones activas. La revisión independiente y la comparación documental se conservan en la misma carpeta privada.

Los identificadores del commit y de su integración se entregan en el mensaje de cierre, después de registrar estos archivos.
