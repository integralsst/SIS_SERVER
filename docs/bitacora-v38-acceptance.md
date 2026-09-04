# Bitácora IA v3.8 · criterios de aceptación

Este cambio separa la evaluación técnica de la nueva evidencia de la comparación contra el estado vigente.

## Reglas

- La IA adjudica DIRECTA / CONTEXTUAL y evalúa la nueva evidencia sin usar el estado actual como ancla.
- Si la evidencia DIRECTA es suficiente, la IA entrega una evaluación técnica 0 / 3 / 5.
- El backend compara ese resultado técnico contra el estado vigente.
- Igual estado sin soporte documental nuevo: SIN_CAMBIO.
- Estado diferente o sin evaluación previa: PROPONER_EVALUACION.
- Igual estado con URL o fecha documental nueva: puede convertirse en soporte nuevo mediante el flujo existente.
- fechaDocumento=null no reduce por sí sola la calificación administrativa.
- Una afirmación explícita de que documentos están fechados y firmados puede satisfacer esa condición cualitativa aunque no exista una única fecha exacta YYYY-MM-DD para almacenar.

## Prueba principal

Una Bitácora que revise por separado:

1. vigencia del acta de conformación del COPASST;
2. todas las actas mensuales requeridas del COPASST, completas, fechadas y firmadas, sin meses pendientes;

Debe producir:

- 1162: DIRECTA, Cumplido 5, SIN_CAMBIO si no hay soporte nuevo;
- 1163: DIRECTA, Parcial 3 -> Cumplido 5, PROPONER_EVALUACION;
- 1161: CONTEXTUAL, no visible como reconocido.

## Regresiones

- 1163: no existen actas -> 0.
- 1163: existen algunas y faltan otras -> 3.
- 1163: todas las exigibles completas -> 5.
- 1162 + 1163 pueden coexistir como DIRECTOS.
- CONTEXTUAL nunca recibe URL, fecha documental ni evaluación.
