# Convenciones de efectivo y rendimiento

Define moneda, fecha, duración de periodos y si los flujos ocurren al inicio, al final o en fechas exactas. Registra desembolsos negativos, entradas positivas e inversión inicial en tiempo cero. Usa flujos incrementales; los costos ya incurridos no cambian la comparación futura, aunque puedan generar restricciones.

Distingue inversión, gasto operativo, depreciación, efecto fiscal, capital de trabajo y financiamiento. Aumentar capital de trabajo consume efectivo; liberarlo aporta efectivo. No presupongas recuperación al finalizar el horizonte ni deduzcas dos veces una inversión ya incluida.

Relaciona flujos nominales con tasa nominal y flujos reales con tasa real, en moneda y periodo consistentes. Una entrada de financiamiento no es un beneficio operativo. Mantén separados valor de empresa y valor del capital de sus propietarios.

| Medida | Cálculo y condición |
|---|---|
| Valor presente neto | `Σ flujo_t / (1+r)^t`, incluido tiempo cero. Algunas funciones de hoja de cálculo empiezan en periodo 1; agrega por separado el flujo inicial cuando corresponda. Para fechas irregulares usa un cálculo por fechas. |
| Tasa interna de retorno | Tasa que hace cero el valor presente neto. Cambios múltiples de signo pueden producir varias soluciones o ninguna; comprueba la raíz. No elijas inversiones excluyentes solo por la tasa mayor. |
| Retorno neto | `(beneficios - costos)/costos` para periodo y costos definidos; con costos cero es indefinido. `beneficios/costos` es otra medida. Indica si usaste descuento. |
| Recuperación simple | Primer momento en que el flujo acumulado sin descuento recupera el desembolso. Si no ocurre en el horizonte, indícalo. No interpoles dentro de un año si los ingresos ocurren exclusivamente al cierre. |
| Recuperación descontada | Primer momento en que se recupera el desembolso con flujos descontados. Ninguna medida de recuperación recoge beneficios posteriores a ese momento. |
| Volumen de equilibrio | Costo fijo dividido entre contribución por unidad, con periodos consistentes, contribución positiva y capacidad suficiente. |
| Costo anual equivalente | Anualidad con tasa y vida explícitas; distínguela de un promedio aritmético del costo total. |

Construye la programación de efectivo con suficiente resolución para detectar faltantes. Autorización de gasto, consumo neto y necesidad máxima de financiamiento son cantidades distintas. Reconciliar saldo inicial + entradas - salidas = saldo final en cada periodo permite comprobar consistencia.

Prueba beneficios nulos, demora o un escenario adverso pertinente. Señala entradas faltantes, cocientes indefinidos, referencias rotas y fórmulas sin recalcular; no los conviertas en ceros que aparenten resultados observados.
