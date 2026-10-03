# Instalación verificada el 2 de octubre de 2026

Se instalaron cuatro perfiles en el directorio personal de agentes de Codex, once skills y siete grupos de hooks. La instalación utiliza un registro propio y conserva los equipos existentes.

La comprobación estructural de los cuatro TOML confirmó los modelos y el razonamiento alto. Node validó la sintaxis de instalador, hooks, registro de asignaciones y consulta nativa. La instalación comprobó 66 archivos previos sin cambios y conservó los grupos ajenos de hooks.

Un proceso nuevo de Codex Desktop 0.159.0-alpha.12.1 cargó las once skills, habilitadas y sin errores propios. `hooks/list` reconoció los siete grupos, habilitados y con `trustStatus: trusted` en la comprobación ejecutada con el usuario de la instalación. La observación anterior desde el usuario restringido del entorno mostró `untrusted`; no se editaron registros de confianza ni se usaron opciones para omitirla.

`debug prompt-input` y `config/read` no expusieron el catálogo de perfiles. Para completar esa comprobación se consultó una sesión efímera sobre los roles de su herramienta nativa de delegación. Identificó los cuatro perfiles exactos, terminó correctamente y no llamó herramientas. No se ejecutaron especialistas: la configuración de modelos está comprobada, pero su uso en producción no se evaluó.

No se produjeron videos, audios, campañas, cursos, diseños ni otros materiales de demostración. No se ejecutaron pruebas exhaustivas o generaciones de servicios externos. No se guardan aquí transcripciones, logs o salidas completas del cliente.

Canva y ElevenLabs están disponibles como herramientas en la sesión de instalación; esto no certifica todas las operaciones o permisos de las cuentas. Shotstack no está registrado como conexión en el perfil inspeccionado. Su skill está instalada y la conexión oficial queda pendiente cuando corresponda utilizarlo. No se solicitaron claves ni se modificó la configuración global de conectores.

Para repetir solo la comprobación estructural usa `node install.mjs verify`. La consulta nativa está en `verify-native.mjs`; requiere la ruta absoluta del ejecutable de Codex y del proyecto. La opción `--confirm-agent-catalog` realiza una respuesta breve en una sesión efímera sin herramientas. No repitas estas comprobaciones sin una modificación o duda concreta.
