# Roster de Comunicación y Formación

El catálogo común de Agent Forge define los agentes y sus instrucciones en [config/roster-catalog.json](../../config/roster-catalog.json) y [rosters/communication](../../rosters/communication/). Este paquete conserva sus skills, referencias, licencias y runtime de hooks.

Para generar, instalar y actualizar los cuatro rosters, utiliza el CLI común descrito en el [README del repositorio](../../README.md) y en la [guía de instalación y recuperación](../../docs/installation-and-recovery.md). Las tres ediciones se generan desde el mismo catálogo.

El instalador autónomo anterior, sus perfiles TOML y la observación histórica de instalación se conservan exclusivamente como [fixtures de pruebas](test/fixtures/legacy-native/README.md). La consulta nativa de Codex permanece disponible en verify-native.mjs cuando se necesita comprobar el cliente instalado.
