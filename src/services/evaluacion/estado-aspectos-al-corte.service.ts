import {
  EstadoGestionSgsst,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

export interface AspectoReferenciaTemporal {
  id: number;
  identidadHistorica?: string | null;
  codigo?: string | null;
}

export interface EvaluacionTemporalSeleccionada {
  aspectoId: number;
  evaluacionId: string;
}

function filtroIdentidadAspecto(
  aspecto: AspectoReferenciaTemporal
): Prisma.EvaluacionAspectoWhereInput {
  if (aspecto.identidadHistorica) {
    return {
      aspecto: {
        identidadHistorica: aspecto.identidadHistorica,
      },
    };
  }

  if (aspecto.codigo) {
    return {
      aspecto: {
        codigo: aspecto.codigo,
      },
    };
  }

  return {
    aspectoId: aspecto.id,
  };
}

export const servicioEstadoAspectosAlCorte = {
  obtenerUltimaEvaluacion: async <TSelect extends Prisma.EvaluacionAspectoSelect>(
    empresaId: string,
    aspecto: AspectoReferenciaTemporal,
    fechaCorte: Date,
    select: TSelect
  ) => {
    return prisma.evaluacionAspecto.findFirst({
      where: {
        ...filtroIdentidadAspecto(aspecto),
        gestion: {
          empresaPeriodo: {
            empresaId,
          },
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          fechaGestion: {
            lte: fechaCorte,
          },
        },
      },
      orderBy: [
        {
          gestion: {
            fechaGestion: "desc",
          },
        },
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select,
    });
  },

  obtenerUltimasEvaluaciones: async <TSelect extends Prisma.EvaluacionAspectoSelect>(
    empresaId: string,
    aspectos: AspectoReferenciaTemporal[],
    fechaCorte: Date,
    select: TSelect
  ) => {
    const resultados = await Promise.all(
      aspectos.map(async (aspecto) => ({
        aspectoIdActual: aspecto.id,
        evaluacion: await servicioEstadoAspectosAlCorte.obtenerUltimaEvaluacion(
          empresaId,
          aspecto,
          fechaCorte,
          select
        ),
      }))
    );

    return new Map(
      resultados
        .filter((item) => Boolean(item.evaluacion))
        .map((item) => [item.aspectoIdActual, item.evaluacion] as const)
    );
  },
};
