# Entrega de los cuatro rosters de Copilot

**Instalado y comprobado estáticamente el 5 de octubre de 2026.**

Rama: `codex/copilot-four-rosters`, creada desde `development` en `D:\Proyectos\Agent Forge\implementation-copilot-four-rosters`. Código instalado: `da6b5b563f46ad0f6eaf8ec87b96ca754412fa39`. Despliegue: `2026-10-05T07-38-38-007Z-ec6b38`. Extensión auxiliar Agent Forge: `0.3.0`.

En el chat nativo de VS Code selecciona el motor **Copilot** y el coordinador correspondiente:

| Selector | Especialistas | Skills propias |
|---|---:|---:|
| `agent-forge-development` | 16 | 18 |
| `agent-forge-research` | 20 | 21 |
| `agent-forge-communication` | 4 | 12 |
| `agent-forge-consulting` | 1 | 9 |

Hay 45 definiciones, 60 skills propias completas y 10 skills de dependencias portables. Los especialistas tienen prefijo `agent-forge-copilot-`, están ocultos del selector y devuelven sus resultados al coordinador. Una biblioteca de estilos v1.1.0 sirve a Comunicación, UX y Frontend. Si el selector conserva su estado anterior, ejecuta **Developer: Reload Window** después de guardar tu trabajo.

Se verificaron los hashes de 900 archivos instalados. Los 725 archivos protegidos de Codex y su registro activo siguen intactos. Se retiraron 28 archivos antiguos administrados e intactos; se conservaron 25 modificados, incluidos 11 agentes históricos que pueden seguir apareciendo en el selector. Consulta [el recibo de instalación](copilot-installation-report.json), [la procedencia de las fuentes](copilot-source-provenance.json) y [el catálogo versionado](../config/copilot-four-rosters.inventory.json).

Se conservaron los modelos explícitos de 40 especialistas y Astra para Investigación. Los otros tres coordinadores y el consultor heredan el modelo del chat. La API consultada no expone `gpt-6.1-sol`, `gpt-6-astra` ni `gpt-6-luna`: las asignaciones permanecen sin sustitución y su disponibilidad queda sin confirmar. El esfuerzo de razonamiento se conserva como metadato y no se declara aplicado por Copilot. Véase [el informe de modelos y herramientas](copilot-client-summary.json).

Confirmaste la autenticación de ElevenLabs y Shotstack en VS Code. El inventario exportado a las 07:30:46 UTC contiene 138 y 15 herramientas respectivamente, con sus esquemas. Se preservaron GitHub, GitKraken, Canva y DigitalOcean. No se invocaron herramientas para generar contenido. El informe [MCP](copilot-mcp-installation.json) distingue esta evidencia del sondeo previo sin autenticación. Se instaló un entorno Python separado con 44 distribuciones fijadas por versión y hash; no se ejecutaron investigaciones, notebooks, generaciones ni indexaciones.

Sólo está instalado el perfil de hooks **Copilot**. `Stop` no cierra sesiones; `Interrupt` requiere `suspend` y el motor Local requiere `end` explícito. Los eventos sin identidad suficiente se registran como cobertura incompleta. Los detalles y comandos del auxiliar están en [la guía](../docs/copilot-four-rosters.md) y en `C:\Users\rober\.agent-forge\copilot\runtime\hooks\README.md`. Los estados de los dos clientes son independientes.

## Inventario y rollback

El [inventario entregado de archivos y 28 respaldos](copilot-installed-files.json) incluye rutas y hashes. El catálogo instalado está en `C:\Users\rober\.agent-forge\copilot\runtime\catalog.json`. El registro y los respaldos transaccionales están bajo `C:\Users\rober\.agent-forge`. Desde este worktree:

```powershell
node packages/cli/dist/index.js --repo . rollback --target vscode --deployment 2026-10-05T07-38-38-007Z-ec6b38
```

Confirma la pregunta del CLI. Los cambios posteriores se preservan mediante las comprobaciones de propiedad y hash. Para revertir sólo la configuración MCP:

```powershell
node packages/cli/dist/index.js --repo . mcp rollback --backup 'C:\Users\rober\.agent-forge\copilot\mcp-backups\bbc898f2-3b37-47d1-898b-1093ae643315' --confirm
```

La guía explica cómo retirar la extensión auxiliar y restaurar sus dos preferencias desde el respaldo separado, conservando cambios posteriores. El rollback no elimina el entorno Python ni el estado de los encargos.

Compilación, sintaxis, inventarios, referencias, hashes y revisión de patrones de secretos completados. **No se crearon ni ejecutaron pruebas funcionales, benchmarks, conversaciones de demostración o pruebas de modelos. El comportamiento real de los agentes y hooks queda sin probar**, conforme a lo solicitado.
