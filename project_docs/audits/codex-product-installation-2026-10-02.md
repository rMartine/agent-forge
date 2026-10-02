# Instalación de agentes de producto para Codex

Este informe distingue la implementación, la instalación de archivos y el comportamiento observado en los clientes. El encargo incluye Codex Desktop y la extensión de Codex para VS Code. El destino `vscode` de Agent Forge identifica GitHub Copilot; no se utilizó ese destino para instalar esta revisión.

## Diseño y fuentes entregadas

El [diseño completo](../architecture/codex-product-agents.md) conserva la dirección técnica en el agente principal de la conversación y asigna responsabilidades delimitadas a 16 especialistas. La [selección de skills](codex-skill-selection.md) documenta seis fuentes descubiertas en skills.sh, revisiones fijas, licencias y 67 adaptaciones. Los cinco paquetes propios se conservan y se añade la skill `agent-forge-build-software-products`: 12 skills instaladas en total.

El manifiesto versión 4 representa esas asignaciones y hooks; se mantiene lectura de versión 3 sin los campos nuevos. Las cantidades del inventario no son restricciones de validación. Se corrigieron además tres discrepancias previas de `handoffs` entre el manifiesto y las fuentes de Copilot (`cto`, `requirements-engineer` y `project-manager`), haciendo coincidir el manifiesto con las fuentes inspeccionadas. No se desplegó Copilot.

## Instalación real aplicada

Se implementó en `codex/software-product-agents`, partiendo de `development` en `cf76a734fe10e2a927c0e784fecf5c85d3417801`. El commit de implementación que identifica el plan instalado es `3dc13553df443010b4538adccb430bde83ea168a`.

La instalación previa registrada era `2026-08-23T21-29-41-905Z-f6bab6`. Sus 16 agentes diferían del registro y sus otros 32 archivos estaban ausentes. Se guardó el plan de reconciliación `reconciled-2026-10-02T21-51-28-537Z-f0f5d0`, con hash `427748ae0feb669d43d76507de3b4709769246b08036c5e2c0de87f3b6f3680b`. Su aplicación respaldó los 16 archivos actuales y el registro anterior, documentó las 32 ausencias y cambió solamente el registro de propiedad.

El plan de instalación `2026-10-02T21-54-06-936Z-b9d1f8` se generó sin errores ni acciones de limpieza. Incluyó los bytes resueltos desde la caché verificada. La aplicación no volvió a descargar recursos: instaló 197 archivos, con cero omitidos y cero fallidos. `status --target codex --json` informó `synced` para los 197 archivos y cero diagnósticos.

Destinos comprobados:

- `C:\Users\rober\.codex\agents`: 16 definiciones TOML.
- `C:\Users\rober\.agents\skills\agent-forge-*`: 12 entradas `SKILL.md` y sus recursos.
- `C:\Users\rober\.codex\hooks.json`: 16 grupos para `SubagentStart`, 16 para `SubagentStop` y uno para cada evento `Stop`, `Interrupt` y `SessionEnd`.
- `C:\Users\rober\.agent-forge`: planes, registro y respaldos de recuperación.

Se compararon antes y después 439 entradas protegidas: configuración e instrucciones globales de Codex, skills personales y archivos ajenos a este despliegue en los directorios inspeccionados de Copilot y skills compartidas. El inventario conservó su hash `3363c659d6506e6c2e532b4550c7029c962dda4979299e205b308c0bb4e1a90b`. Esta comparación acredita el estado inmediatamente posterior a instalar; no impide cambios posteriores del usuario o del cliente.

## Comprobaciones ejecutadas

Entorno observado: Node.js 22.22.3 y npm 10.9.8 en Windows; ejecutable de Codex 0.159.0-alpha.12.1; extensión `openai.chatgpt` instalada 26.928.40906.

| Comando o material | Resultado observado y alcance |
|---|---|
| `npm run build` | Compilaron núcleo y CLI con TypeScript y extensión con esbuild. |
| `npm run prepare:skills` | Verificó 140 recursos originales fijados; resolvió seis skills y sus adaptaciones sin modificar el perfil. |
| `npm test` y repetición de `npm test -w packages/cli` después de añadir reconciliación | Núcleo: 87 pruebas aprobadas, una omitida de 88 por permiso Windows para symlink de archivo. CLI final: 13 aprobadas. Contrato de extensión: una aprobada. |
| `npm run test:extension-host` | Aprobó dentro de VS Code 1.104.0 con perfil temporal. Primero detectó la expectativa obsoleta de cinco skills; se corrigió para usar el manifiesto y se volvió a ejecutar con salida 0. Es una prueba de la extensión Agent Forge, no de conversaciones en la extensión de Codex. |
| `node packages/cli/dist/index.js --repo . validate --strict --target all` | Validación estructural de ambos destinos aprobada. |
| Pruebas de hooks | Sesiones inactivas, filtros, evidencias, concurrencia, interrupción, una sola continuación, límites y especialistas de solo lectura. La prueba de junction de Windows sí se ejecutó. |
| Pruebas de instalación y recuperación | Preservación de grupos de hooks ajenos, cambios posteriores, colisiones, planes alterados, fallas durante la aplicación, archivos vacíos y recuperación. El caso de 16 modificados y 32 ausentes recuperó exactamente esa situación después de instalar y revertir. Son perfiles temporales, no una reversión de la instalación real. |
| [Evaluación guiada de escenarios](codex-product-forward-evaluation.md) | Seis escenarios existentes, decisiones de activación y 72 procesos Node reales con eventos sintéticos. No equivale a una evaluación ciega ni a ejecución nativa de hooks en clientes. |

Los archivos temporales de pruebas, cachés, compilados, productos de aceptación y respaldos personales no se registraron en Git. No se publicaron ramas ni se desplegó un producto en servicios externos.

## Observación de clientes

Desktop: se abrió la sesión `01a0fe9d-6ef5-7271-aaf4-570bfd0ec2a0` con una petición de producto que no nombraba la skill. Descubrió y leyó `agent-forge-build-software-products`, definió criterios de aceptación, activó el registro temporal con su identificador real y delegó la interfaz. El producto de aceptación se encuentra en `C:\Users\rober\Documents\Codex\2026-10-02\agent-forge-product-acceptance\outputs\pendientes-equipo`. Construyó una interfaz en español, API HTTP y persistencia SQLite sin dependencias de aplicación externas. Ocho pruebas de API y persistencia y ocho comprobaciones en Chrome pasaron después de corregir dos errores de las propias pruebas. La persistencia se comprobó terminando un proceso y arrancando otro con la misma base. Se observaron además validación de entradas, recuperación de fallas, interacción con teclado y presentación de texto potencialmente malicioso sin ejecutarlo. El servidor final respondió HTTP 200 en `http://127.0.0.1:3000` con una base vacía lista para usar. La preparación del informe de evidencia seguía en curso al registrar estos resultados.

Desktop, consulta general: la sesión nueva `01a0fea1-6373-71e0-8276-eda513e5068d` contestó brevemente la diferencia entre interfaz de programación e interfaz de usuario. Su turno terminó sin llamadas de herramientas ni especialistas. La consulta del registro devolvió `unregistered`; no se activó una sesión de producto.

VS Code: se abrió el cliente real en `D:\Proyectos\Agent Forge\codex-vscode-acceptance`, con `PRUEBA.md` que contiene una petición explícita de producto y una consulta general para sesiones nuevas de la extensión Codex. La ejecución de esas conversaciones requiere que el usuario envíe los textos en la extensión; está pendiente. No se presenta la prueba de extensión de Agent Forge ni el ejecutable de Codex como sustituto de esta observación.

Los hooks nuevos requieren la [revisión nativa de confianza de Codex](https://learn.chatgpt.com/docs/hooks). La documentación sitúa `/hooks` en la CLI de Codex con el mismo perfil; no se presupone que exista en las interfaces de Desktop o de la extensión. Se solicitó esa interacción después de instalar y abrir el archivo exacto. No se alteró el registro de confianza ni se usaron opciones para omitirlo. Hasta observar los eventos en ambos clientes, su ejecución nativa sigue pendiente.

## Recuperación

Ejecutar desde `D:\Repositorios\agent-forge` para regresar al estado capturado justo antes de instalar:

```powershell
node packages/cli/dist/index.js --repo . rollback --target codex --deployment 2026-10-02T21-54-06-936Z-b9d1f8
node packages/cli/dist/index.js --repo . reconcile restore --target codex --plan reconciled-2026-10-02T21-51-28-537Z-f0f5d0 --json
```

El primer comando revierte el despliegue conservando modificaciones posteriores que no coincidan con sus hashes. El segundo restaura el registro previo solo si el estado reconciliado vuelve a estar activo y sus archivos coinciden; ante diferencias conserva el estado y reporta el impedimento. Los respaldos originales están en `C:\Users\rober\.agent-forge\reconciliations\reconciled-2026-10-02T21-51-28-537Z-f0f5d0`.

La implementación e instalación de archivos están realizadas. El encargo completo no se considera concluido mientras falten la confianza, los eventos nativos y las comprobaciones de ambos clientes que correspondan.
