import { prisma } from "../../lib/prisma";
import { resolverResultadoEfectivoEvaluacion } from "./resultado-efectivo-evaluacion.service";

interface HistorialEvaluacionPresentable {
  id: string;
  calificacionAdministrativa: number;
}

interface HistorialPaginadoPresentable<
  T extends HistorialEvaluacionPresentable,
> {
  historial: T[];
}

export async function enriquecerHistorialConResultadoEfectivo<
  T extends HistorialEvaluacionPresentable,
  R extends HistorialPaginadoPresentable<T>,
>(resultado: R): Promise<
  Omit<R, "historial"> & {
    historial: Array<
      T & {
        calificacionRegistrada: number;
        calificacionEfectiva: number;
        resultadoProvisional: boolean;
        causaResultadoEfectivo: string;
        decisionNoAplica: {
          estado: string;
          resultadoEfectivo: number;
          observacionDecision: string | null;
        } | null;
        aprobacionGestion: {
          estado: string;
          observacionDecision: string | null;
        } | null;
      }
    >;
  }
> {
  if (resultado.historial.length === 0) {
    return {
      ...resultado,
      historial: [],
    };
  }

  const evaluaciones = await prisma.evaluacionAspecto.findMany({
    where: {
      id: {
        in: resultado.historial.map((item) => item.id),
      },
    },
    select: {
      id: true,
      estadoCumplimiento: true,
      calificacionAdministrativa: true,
      decisionNoAplica: {
        select: {
          estado: true,
          resultadoEfectivo: true,
          observacionDecision: true,
        },
      },
      aprobacionGestion: {
        select: {
          aprobacionGestion: {
            select: {
              estado: true,
              observacionDecision: true,
            },
          },
        },
      },
    },
  });

  const porId = new Map(
    evaluaciones.map((evaluacion) => [
      evaluacion.id,
      evaluacion,
    ])
  );

  return {
    ...resultado,
    historial: resultado.historial.map((item) => {
      const evaluacion = porId.get(item.id);

      if (!evaluacion) {
        return {
          ...item,
          calificacionRegistrada:
            item.calificacionAdministrativa,
          calificacionEfectiva:
            item.calificacionAdministrativa,
          resultadoProvisional: false,
          causaResultadoEfectivo: "REGISTRADA",
          decisionNoAplica: null,
          aprobacionGestion: null,
        };
      }

      const efectivo = resolverResultadoEfectivoEvaluacion(
        evaluacion
      );

      return {
        ...item,
        calificacionRegistrada:
          evaluacion.calificacionAdministrativa.toNumber(),
        calificacionAdministrativa: efectivo.calificacion,
        calificacionEfectiva: efectivo.calificacion,
        resultadoProvisional: efectivo.provisional,
        causaResultadoEfectivo: efectivo.causa,
        decisionNoAplica: evaluacion.decisionNoAplica
          ? {
              estado: evaluacion.decisionNoAplica.estado,
              resultadoEfectivo:
                evaluacion.decisionNoAplica.resultadoEfectivo.toNumber(),
              observacionDecision:
                evaluacion.decisionNoAplica.observacionDecision,
            }
          : null,
        aprobacionGestion:
          evaluacion.aprobacionGestion?.aprobacionGestion
            ? {
                estado:
                  evaluacion.aprobacionGestion.aprobacionGestion
                    .estado,
                observacionDecision:
                  evaluacion.aprobacionGestion.aprobacionGestion
                    .observacionDecision,
              }
            : null,
      };
    }),
  };
}
