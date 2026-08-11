# Auditorías SG-SST

Este módulo registra auditorías, hallazgos, recomendaciones y seguimientos asociados a un periodo de empresa.

## Reglas funcionales

- Una auditoría pertenece a un `EmpresaPeriodo`.
- Un hallazgo puede ser general o estar vinculado a un `Aspecto` de la misma versión de Supermatriz del periodo.
- Auditorías, hallazgos y recomendaciones no modifican evaluaciones históricas ni calificaciones.
- Las correcciones que deban alterar una calificación se realizan mediante los flujos normales de gestión/evaluación o compromisos.
- Una auditoría finalizada conserva su contenido histórico; se permiten seguimientos posteriores y ajustes operativos de responsable/fecha objetivo.
- Una auditoría cancelada no admite nuevos seguimientos.
- Los hallazgos vinculados a un aspecto se incorporan a la trazabilidad de ese aspecto.
- Las recomendaciones y hallazgos pendientes pueden generar acciones en el Centro de Acciones según responsable, estado y vencimiento.

## Estados

Auditoría: `BORRADOR`, `EN_EJECUCION`, `FINALIZADA`, `CANCELADA`.

Hallazgo: `ABIERTO`, `EN_GESTION`, `RESUELTO`, `CERRADO`.

Recomendación: `PENDIENTE`, `EN_PROGRESO`, `ATENDIDA`, `DESCARTADA`.
