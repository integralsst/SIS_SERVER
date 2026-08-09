# Controles de evaluación · Fase 5B

Esta carpeta mantiene separados los controles posteriores a una gestión finalizada:

- `no-aplica/`: decisión independiente de solicitudes de No aplica.
- `aprobaciones/`: aprobación administrativa de gestiones según `ReglaAprobacionGestion`.
- `resultado-efectivo-evaluacion.service.ts`: única capa para convertir la evaluación registrada en el resultado efectivo usado por matriz y resultados.
- `controles-finalizacion.service.ts`: crea los registros de control al finalizar una gestión sin sobrescribir `EvaluacionAspecto`.
- `alertas-control-evaluacion.service.ts`: genera acciones pendientes para el centro unificado.

Principio de trazabilidad: `EvaluacionAspecto` conserva el dato originalmente registrado; las decisiones se persisten como entidades relacionadas y el resultado efectivo se resuelve al consultar.
