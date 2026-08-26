import {
  EstadoGestionSgsst,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

export interface AspectoReferenciaTemporal {
  id: number;
  identidadHistorica: string;
}

export const servicioEstadoAspectosAlCorte = {
  obtenerUltimasEvaluaciones: async <TSelect extends Prisma.EvaluacionAspectoSelect>(
    empresaId: string,
    aspectos: AspectoReferenciaTemporal[],
    fechaCorte: Date,
    select: TSelect
  ) => {
    if (aspectos.length === 0) {
      return new Map<number, unknown>();
    }

    const aspectoActualPorIdentidad = new Map(
      aspectos.map((aspecto) => [
        aspecto.identidadHistorica,
        aspecto.id,
      ])
    );
    const identidades = [...aspectoActualPorIdentidad.keys()];

    const candidatos = await prisma.evaluacionAspecto.findMany({
      where: {
        aspecto: {
          identidadHistorica: {
            in: identidades,
          },
        },
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
      select: {
        id: true,
        aspecto: {
          select: {
            identidadHistorica: true,
          },
        },
      },
    });

    const evaluacionIdPorIdentidad = new Map<string, string>();

    for (const candidato of candidatos) {
      const identidad = candidato.aspecto.identidadHistorica;
      if (!evaluacionIdPorIdentidad.has(identidad)) {
        evaluacionIdPorIdentidad.set(identidad, candidato.id);
      }
    }

    const evaluacionIds = [...evaluacionIdPorIdentidad.values()];

    if (evaluacionIds.length === 0) {
      return new Map<number, unknown>();
    }

    const evaluaciones = await prisma.evaluacionAspecto.findMany({
      where: {
        id: {
          in: evaluacionIds,
        },
      },
      select,
    });
    const evaluacionesPorId = new Map(
      evaluaciones.map((evaluacion) => [
        (evaluacion as { id: string }).id,
        evaluacion,
      ])
    );
    const resultado = new Map<number, (typeof evaluaciones)[number]>();

    for (const [identidad, evaluacionId] of evaluacionIdPorIdentidad) {
      const aspectoIdActual = aspectoActualPorIdentidad.get(identidad);
      const evaluacion = evaluacionesPorId.get(evaluacionId);

      if (aspectoIdActual && evaluacion) {
        resultado.set(aspectoIdActual, evaluacion);
      }
    }

    return resultado;
  },
};
