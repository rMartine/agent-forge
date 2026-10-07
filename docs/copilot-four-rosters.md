# Cuatro rosters de Agent Forge en VS Code

En el chat de VS Code selecciona el motor **Copilot** y uno de estos agentes:

| Coordinador | Especialistas | Skills propias |
|---|---:|---:|
| `agent-forge-development` | 16 | 18 |
| `agent-forge-research` | 20 | 21 |
| `agent-forge-communication` | 4 | 12 |
| `agent-forge-consulting` | 1 | 9 |

Los 41 especialistas se ocultan del selector y sólo los coordinadores pueden delegarlos. Sus nombres Copilot son `agent-forge-copilot-` seguido por el identificador original del rol. Sus archivos tienen `agents: []`. Los cuatro coordinadores pueden solicitar aportes de cualquier roster; conservan contexto, alcance, cliente, proyecto y responsabilidad. La biblioteca única `agent-forge-copilot-communication-design-styles` v1.1.0 sirve a Comunicación, UX y Frontend.

## Modelos y herramientas

Se conservan los 40 modelos explícitos de especialistas y Astra en la dirección de Investigación. El consultor y los otros tres coordinadores heredan la selección del chat. El catálogo instalado conserva también el esfuerzo original. El frontmatter de agentes no documenta un control equivalente del esfuerzo: no se considera aplicado. Un identificador ausente del catálogo de modelos de Copilot no se sustituye; los archivos se instalan y esa disponibilidad queda pendiente. No se ejecutaron modelos para comprobarla.

Los roles de sólo lectura reciben herramientas `read`, `search` y `web`; sus instrucciones devuelven propuestas y evidencia al coordinador. Esto no constituye un sandbox de sistema operativo. Los roles con escritura utilizan herramientas nativas y los grupos MCP configurados. Los nombres y esquemas concretos se obtienen del catálogo negociado en VS Code; un nombre histórico no garantiza equivalencia. Las credenciales pertenecen a VS Code y no se importan desde otro cliente.

## Estado y hooks

Recursos: `%USERPROFILE%/.agent-forge/copilot/runtime`. Estado exclusivo: `%USERPROFILE%/.agent-forge/copilot/state`. Agentes, skills y el único perfil de hooks se instalan en `%USERPROFILE%/.copilot/{agents,skills,hooks}`. La instalación no copia autorizaciones, asignaciones ni sesiones de Codex.

Los coordinadores usan el auxiliar `runtime/hooks/session.mjs` con roster, comando, `--session` real y `--project` absoluto. El ID debe existir en un evento observado. Lee `runtime/hooks/README.md` para los comandos completos y `runtime/hooks/coverage.json` para la cobertura del motor elegido. Nunca invoques directamente los auxiliares originales de sesión: el adaptador fuerza almacenes exclusivos de Copilot.

Copilot no documenta ID de instancia en `subagentStart`, ni ID de actor/operación en todos los eventos de herramientas. El adaptador declara cobertura incompleta y no atribuye esas operaciones a un especialista. `bind` sólo vincula un ID ya observado al encargo preparado. Local informa más identificadores, pero no garantiza el actor de cada operación. Los controles originales se aplican únicamente con identidad y parámetros suficientes; nunca conceden permisos del cliente.

`Stop` indica final de turno. Los hooks pueden comprobar o terminar el encargo, pero no se convierten en fin de sesión. `Interrupt` no tiene equivalente automático documentado; usa `suspend`. Copilot informa `sessionEnd`; Local requiere el comando `end`. Las continuaciones se agregan y limitan a una. La recuperación de bloqueos conserva comprobación de propietario muerto, hash y recibo; no borra bloqueos vivos automáticamente.

El ejecutor científico conserva las políticas de autorización y tiene un inventario de hashes de los bytes adaptados. El intérprete existente se registra por inspección. Graphify conserva sus auxiliares e intérprete instalado; instalar los rosters no ejecuta indexaciones, investigaciones ni generaciones.

## Instalación y cambio de motor

Desde el checkout compilado:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run build
node packages/cli/dist/index.js --repo . preview --target vscode --rosters all --harness copilot --download-skills
node packages/cli/dist/index.js --repo . deploy --target vscode --plan ID_PLAN --confirm ID_PLAN
```

La vista previa es inmutable y la transacción verifica hashes, propiedad y colisiones. Para Local crea otra vista previa con `--harness local`: el mismo archivo de hooks se reemplaza; no se instalan ambos perfiles. No cambies manualmente el motor de un archivo generado. `--target vscode` conserva la instalación de Codex.

Sólo se retiran archivos obsoletos administrados cuyo hash permanece intacto. Un archivo modificado o ajeno se conserva y aparece en el informe. Los nombres nuevos de especialistas evitan suplantar perfiles históricos. Es posible que esos perfiles conservados sigan apareciendo en el selector; usa los cuatro coordinadores indicados.

MCP se configura mediante `mcp setup --config RUTA_MCP_JSON`. Conserva proveedores e inputs existentes, añade ElevenLabs y Shotstack ausentes y deja un respaldo privado. En VS Code abre **MCP: List Servers**, inicia los proveedores nuevos y completa OAuth. Revisa herramientas y esquemas sin generar contenido. La instalación no declara autenticada una conexión sólo por existir su configuración.

Para actualizar el inventario ejecuta **Agent Forge: Export Copilot Model and Tool Metadata**. Sólo consulta los modelos anunciados y los esquemas de herramientas registrados; después crea una nueva vista previa y despliega para incorporar el catálogo actualizado.

## Rollback

Usa `node packages/cli/dist/index.js rollback --target vscode --deployment ID_DESPLIEGUE` para restaurar el despliegue anterior según el registro y confirma la pregunta del CLI. Si omites `--deployment`, selecciona el despliegue activo. Los archivos modificados posteriormente se preservan y requieren resolver su diferencia. Los respaldos y planes están bajo `%USERPROFILE%/.agent-forge`.

Para la configuración MCP usa `node packages/cli/dist/index.js mcp rollback --backup DIRECTORIO_RESPALDO --confirm`. Comprueba el hash del perfil antes de restaurar. Los entornos Python adicionales sólo contienen dependencias; el rollback de archivos no elimina entornos ni estado de trabajo. Conserva esos datos si necesitas recuperar encargos.

La extensión auxiliar se puede retirar con `code.cmd --uninstall-extension agent-forge.agent-forge`. Sus preferencias `agentForge.repoPath` y `agentForge.copilotHarness` tienen un respaldo separado, registrado en `project_docs/copilot-extension-settings.json`. Restaura `settings.before.bak` únicamente si el hash actual de `settings.json` coincide con `afterHash`; si cambió, recupera sólo esas dos preferencias del respaldo para conservar los demás ajustes.

## Alcance de la comprobación

La entrega se comprueba mediante compilación, sintaxis, inventarios, referencias, hashes y configuración. No se realizan pruebas funcionales, benchmarks, conversaciones de demostración ni pruebas de modelos. La autenticación y negociación MCP se registran por separado. El comportamiento real de agentes y hooks queda sin probar.

Contratos consultados: [agentes](https://code.visualstudio.com/docs/agent-customization/custom-agents), [skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [hooks](https://code.visualstudio.com/docs/agents/reference/hooks-reference), [MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [ElevenLabs](https://elevenlabs.io/mcp) y [Shotstack](https://shotstack.io/docs/guide/agents/mcp-server/).
