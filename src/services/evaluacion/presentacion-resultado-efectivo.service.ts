import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { resolverResultadoEfectivoEvaluacion } from "./resultado-efectivo-evaluacion.service";

interface HistorialEvaluacionPresentable {
  id: string;
  calificacionAdministrativa: number;
}

interface HistorialPaginadoPresentable {
  historial: HistorialEvaluacionPresentable[];
}

type ItemHistorial<
  R extends HistorialPaginadoPresentable,
> = R["historial"][number];

type ResultadoEfectivoHistorial = {
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
  registradoPor: {
    id: string;
    nombre: string;
    rol: string;
  } | null;
  evaluacionAnterior: {
    estadoCumplimiento: string | null;
    calificacionAdministrativa: number | null;
    observacion: string | null;
    registradaPor: {
      id: string;
      nombre: string;
      rol: string | null;
    } | null;
  } | null;
};

function asRecord(
  value: Prisma.JsonValue | null | undefined
): Record<string, Prisma.JsonValue> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

function asString(value: Prisma.JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: Prisma.JsonValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function extraerEvaluacionAnterior(
  value: Prisma.JsonValue | null | undefined
): ResultadoEfectivoHistorial["evaluacionAnterior"] {
  const anterior = asRecord(value);
  if (!anterior) return null;

  const usuario = asRecord(anterior.usuarioRegistrador);

  return {
    estadoCumplimiento: asString(anterior.estadoCumplimiento),
    calificacionAdministrativa:
      asNumber(anterior.calificacionAdministrativa),
    observacion: asString(anterior.observacion),
    registradaPor: usuario
      ? {
          id: asString(usuario.id) ?? "",
          nombre: asString(usuario.nombre) ?? "Usuario anterior",
          rol: asString(usuario.rol),
        }
      : null,
  };
}

export async function enriquecerHistorialConResultadoEfectivo<
  R extends HistorialPaginadoPresentable,
>(resultado: R): Promise<
  Omit<R, "historial"> & {
    historial: Array<
      ItemHistorial<R> & ResultadoEfectivoHistorial
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
      usuarioRegistrador: {
        select: {
          id: true,
          nombre: true,
          rol: true,
        },
      },
      historial: {
        where: {
          accion: "CREAR_EVALUACION_DIRECTA",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          datosAntes: true,
        },
      },
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
          registradoPor: null,
          evaluacionAnterior: null,
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
        registradoPor: evaluacion.usuarioRegistrador,
        evaluacionAnterior: extraerEvaluacionAnterior(
          evaluacion.historial[0]?.datosAntes
        ),
      };
    }) as Array<
      ItemHistorial<R> & ResultadoEfectivoHistorial
    >,
  };
}
