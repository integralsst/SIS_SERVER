# Reconciliación global de Bitácora IA

## Propósito
Evitar falsos positivos de reconocimiento cuando varios aspectos candidatos se solapan semánticamente y uno de ellos explica de forma más específica la evidencia registrada.

## Invariante principal
`recuperado ≠ reconocido ≠ evaluable`

La misma llamada de IA debe devolver:

- propuestas individuales por candidato;
- `aspectosDirectosFinales`, que representa el conjunto reconciliado de aspectos realmente tratados;
- `justificacionAdjudicacionGlobal`.

El backend aplica una política de precisión conservadora:

- un aspecto solo puede sobrevivir como DIRECTO si la propuesta individual es DIRECTA y además está incluido en `aspectosDirectosFinales`;
- una propuesta individual DIRECTA que no sobreviva al cierre global se degrada a CONTEXTUAL;
- el cierre global nunca promueve una propuesta individual CONTEXTUAL a DIRECTA;
- una propuesta CONTEXTUAL no puede conservar URL, fecha documental ni evaluación.

## Regresión principal
Una anotación que verifica únicamente la vigencia del acta de conformación del COPASST no debe reconocer simultáneamente el requisito compuesto de convocatoria + elección + conformación si dicho requisito no fue revisado como unidad.

## Casos que deben preservarse

- Actas mensuales del COPASST inexistentes de forma explícita → 0.
- Actas mensuales revisadas expresamente con meses faltantes → 3.
- Actas mensuales completas para el periodo exigido → 5.
- Una nota sobre conformación/vigencia que no evalúa actas de reunión → aspecto de actas contextual.
- Una anotación que evalúa de forma independiente varios requisitos puede conservar 1–N aspectos DIRECTOS.
