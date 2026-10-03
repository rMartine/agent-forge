# Medición de procesos y registros de eventos

Define población, selección, periodo y tratamiento de datos faltantes o casos sin terminar. Usa distribución y percentiles cuando un promedio oculte esperas extremas. Compara periodos con reglas de medición compatibles y conserva los casos difíciles.

Para registros de eventos identifica al menos caso, actividad, marca de tiempo y significado del evento. Si existen, conserva inicio/finalización, recurso, atributos y resultado. Comprueba duplicados, orden de eventos, zonas horarias, reaperturas y ventanas incompletas. Distingue falta de datos de incumplimiento real. Una desviación puede ser error, excepción legítima o solución práctica a una limitación del procedimiento.

El tiempo disponible dividido por la demanda del mismo periodo permite calcular el ritmo requerido por unidad. Contrástalo con capacidad efectiva, recursos paralelos, disponibilidad, retrabajo y mezcla de casos. Para un flujo estable y límites consistentes, la ley de Little relaciona trabajo promedio en proceso = tasa de salida × tiempo promedio en el sistema. No la apliques sin matices a acumulaciones transitorias. Menos espera no implica horas de trabajo liberadas equivalentes.

Para inferir capacidad estadística, verifica estabilidad, representatividad, medición y distribución adecuadas. Los límites de especificación provienen del requisito; los límites de control provienen de la variación observada. Un plazo máximo unilateral no justifica inventar un límite mínimo.

Con límites bilaterales y supuestos adecuados, `Cp = (límite superior - límite inferior)/(6σ)` y `Cpk = min((límite superior - μ)/(3σ), (μ - límite inferior)/(3σ))`. Define cómo estimaste media y variación; si los datos no permiten la inferencia, reporta desempeño observado y limitación. Consulta el método aplicable en una fuente primaria antes de emitir una conclusión estadística, por ejemplo el [manual de NIST sobre capacidad](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm).

Elige gráficas de control según datos, agrupación y exposición: mediciones continuas, proporciones de casos defectuosos y conteos de errores no son intercambiables. Comprueba independencia y tamaños de muestra. Define señal, investigación y responsable; no recalcules límites para ocultar deterioro.

Antes de atribuir una mejora a una intervención, considera estacionalidad, mezcla de casos, dotación y cambios simultáneos. Una observación favorable puede ser útil sin demostrar causalidad. Distingue ahorro recurrente de liberación única de capital de trabajo.
