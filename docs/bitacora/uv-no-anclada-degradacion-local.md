# Bitácora · regresión UV no anclada

## Caso real
Una respuesta válida de OpenRouter puede contener una unidad de verificación cuyo `fragmentoBitacora` no sea una copia literal continua del registro. La unidad no es confiable como ancla y debe descartarse, pero no debe invalidar las demás unidades válidas de la misma respuesta.

## Invariante
- Una UV no anclada literalmente nunca puede sustentar una evaluación.
- Una propuesta DIRECTA solo puede sobrevivir si conserva al menos una UV `EVALUACION` validada.
- Referencias a UV descartadas se eliminan de la propuesta final.
- IDs de UV malformados o duplicados siguen siendo errores estructurales.
- El resto del análisis continúa con las UV válidas.

## Regresión esperada
Para una respuesta con `UV-1`, `UV-2`, `UV-3`, `UV-4` donde únicamente `UV-3` no está anclada literalmente:

1. `UV-3` se descarta y se registra en logs sin imprimir el fragmento sensible.
2. Las propuestas que dependen solo de `UV-3` dejan de ser DIRECTAS y no generan 0/3/5.
3. Las propuestas que además conservan otra UV `EVALUACION` válida pueden continuar usando únicamente las UV verificadas.
4. Las propuestas no relacionadas con `UV-3` continúan normalmente.
5. La Bitácora completa no termina con `BITACORA_IA_UNIDAD_NO_ANCLADA` por ese único defecto local.

No se modifica el prompt, el motor 0/3/5, retrieval, URLs, Prisma ni frontend.
