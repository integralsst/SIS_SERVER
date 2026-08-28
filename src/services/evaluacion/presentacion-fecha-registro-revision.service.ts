import { prisma } from "../../lib/prisma";

export async function enriquecerRevisionesConFechaRegistroEvaluacion<
  T extends {
    revisiones: Array<{
      evaluacion: {
        id: string;
      };
    }>;
  },
>(resultado: T): Promise<T> {
  const evaluacionIds = [
    ...new Set(
      resultado.revisiones.map(
        (revision) => revision.evaluacion.id
      )
    ),
  ];

  if (evaluacionIds.length === 0) {
    return resultado;
  }

  const evaluaciones = await prisma.evaluacionAspecto.findMany({
    where: {
      id: {
        in: evaluacionIds,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  const fechaRegistroPorEvaluacion = new Map(
    evaluaciones.map((evaluacion) => [
      evaluacion.id,
      evaluacion.createdAt.toISOString(),
    ])
  );

  for (const revision of resultado.revisiones) {
    Object.assign(revision.evaluacion, {
      creadaEn:
        fechaRegistroPorEvaluacion.get(
          revision.evaluacion.id
        ) ?? null,
    });
  }

  return resultado;
}
