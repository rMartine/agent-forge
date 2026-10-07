# Comparación de guías de interfaz: materiales y evidencia

Esta comparación corresponde al encargo de evaluar Impeccable adaptada frente a frontend-design de Anthropic antes de retirar esta última. No se presenta como una comparación ciega entre modelos ni como una evaluación de los productos reales.

## Criterios definidos antes de construir los materiales

Se guardaron ocho criterios en `.cache/design-comparison/criteria.json` antes de generar los HTML: acciones funcionales y feedback; comportamiento responsive a 320 y 1440 píxeles; texto largo y valores opcionales; estados de carga, vacío y error con recuperación; nombres accesibles y foco visible; reducción de movimiento; preservación de identidad y dependencias; identificación de materiales sintéticos y límites de evidencia.

Las variantes comparten contenido, controles, estados y lógica, para comparar decisiones de presentación sin introducir diferencias de funciones. La variante A se elaboró leyendo frontend-design adaptada; la B leyendo Impeccable adaptada y sus referencias pertinentes. El mismo agente produjo ambas; esta dependencia impide atribuir causalmente una diferencia de calidad a la guía. No se copiaron código, datos ni marca reales de Skillara o Liravo.

## Materiales preparados

| Caso sintético | Función incluida en ambas variantes | Aspectos por observar |
|---|---|---|
| Pantalla operativa orientada a Skillara | Lista de actividades, búsqueda, cambio de estado, nombre largo, responsable ausente y selector de carga/vacío/error con reintento. | Legibilidad, acciones alcanzables, jerarquía operacional, foco después de cambiar un estado, ausencia de overflow. |
| Flujo móvil orientado a Liravo | Elegir actividad y duración, validación de entrada, revisión, regreso a edición y guardado solo en memoria del ejemplo. | Teclado, texto largo, foco al cambiar de paso y anchura móvil. Es HTML; no acredita Expo, gestos nativos, Android, iOS ni haptics. |
| Página comercial del producto ficticio | Proposición explícitamente sintética, explicación de funciones realmente presentes en el ejemplo y enlaces hacia la demostración local. | Jerarquía, lectura en tamaños distintos, navegación y ausencia de afirmaciones comerciales inventadas. |

Los seis archivos son `.cache/design-comparison/{operational,mobile,commercial}-{a,b}.html`; el índice, generador y comprobador también están en esa caché ignorada. No se instalaron paquetes, no hay fuentes o scripts remotos y no se enviaron datos. Los nombres son identificadores de los materiales, no nombres nuevos de requisitos.

## Resultados observados

El comprobador `node .cache/design-comparison/check-static.cjs` analiza los seis archivos: JavaScript sintácticamente válido, identificadores únicos, etiquetas dirigidas a entradas existentes, destinos locales existentes, declaración de viewport, reglas de foco/reduced-motion y ausencia de scripts o estilos remotos. El resultado y SHA-256 por archivo quedan en `.cache/design-comparison/static-results.json`. Estos resultados prueban estructura y sintaxis; no prueban que los controles hayan sido ejecutados, que el foco sea visible o que no exista overflow.

Se intentó abrir el índice con `cua.createBrowserTab('chrome', 'file:///D:/Repositorios/agent-forge/.cache/design-comparison/index.html', ...)`. Browser Use rechazó el protocolo file por su política de URL e indicó expresamente no conseguir la misma acción bloqueada mediante rutas alternativas, ejecución indirecta u otro navegador. No se sorteó la restricción sirviendo los archivos por otro protocolo ni utilizando automatización alternativa. Por tanto, no hay capturas, navegación real, medidas de 320/1440 píxeles, prueba visual de foco ni ejecución de preferencias de movimiento que puedan afirmarse como realizadas.

## Comparación del contenido de las guías

| Responsabilidad | Anthropic adaptada examinada | Impeccable adaptada examinada | Conclusión sustentada |
|---|---|---|---|
| Identidad y decisión visual | Exige seguir el brief y escoger deliberadamente tipografía, color y estructura. | Exige preservar contexto/identidad y elegir criterios por la tarea de la superficie. | Ambas contienen instrucciones útiles; la revisión estática no demuestra que una produzca mejores imágenes. |
| Pantallas operativas y lectura | Su apertura y proceso se expresan principalmente en términos de hero y diseño web; sí incluye accesibilidad y estados de error/vacío. | Separa tareas operativas, lectura y marketing, y ofrece referencias explícitas de componentes y layout. | Impeccable tiene cobertura procedimental más explícita para el roster de producto; no equivale a superioridad visual observada. |
| Datos extremos y recuperación | Expresa la calidad requerida de forma general. | Detalla valores opcionales, error, autorización, repetición, respuestas fuera de orden, limpieza y cancelación. | Hay mayor especificidad documental, complementada por break-ui; no se presume que esos defectos hayan sido evitados en ejecución. |
| Native y versiones | No aporta un procedimiento nativo versionado. | La adaptación exige convenciones nativas y deriva movimiento a animate-expo; las referencias propias comprueban SDK54. | La cobertura del conjunto aumenta, pero esta comparación HTML no valida React Native. |
| Comandos y autoridad | La adaptación anterior eliminó historia ficticia y confirmaciones obligatorias. | La nueva adaptación elimina el launcher, scripts descargables, detector, hook manager y delegaciones recursivas. | Los textos finales evitan esas dependencias; no se ejecutó software upstream. |

## Decisión y pendiente concreto

La evidencia actual sostiene que Impeccable adaptada aporta instrucciones más explícitas para el trabajo de producto y que ambas guías pueden aplicarse a materiales con el mismo contrato. No sostiene una victoria visual ni una ejecución satisfactoria de los tres casos. Por esa razón esta revisión conserva frontend-design como guía general y restringe Impeccable a solicitudes explícitas de uso o comparación dentro del producto autorizado. El catálogo y la entrada adaptada expresan la provisionalidad; no quedan como guías generales equivalentes.

Queda pendiente abrir estos materiales en un entorno de navegador permitido, ejecutar los ocho criterios y registrar fallas o resultados por variante. Debe indicarse que el mismo autor preparó ambas y que el caso móvil sigue sin ser una aplicación Expo. La integración final del catálogo y el registro de instalación deben reflejar esa limitación; la mera existencia de este informe no acredita la comparación visual.
