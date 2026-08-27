import { EstadoGestionSgsst } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ErrorEvaluacion } from "../../utils/evaluacion";

export async function asegurarEvaluacionVigenteParaEvidencia(
  evaluacionId: string
): Promise<void> {
  const evaluacion = await prisma.evaluacionAspecto.findUnique({
    where: {
      id: evaluacionId,
    },
    select: {
      id: true,
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
      gestion: {
        select: {
          estado: true,
          empresaPeriodoId: true,
        },
      },
    },
  });

  if (
    !evaluacion ||
    evaluacion.gestion.estado !== EstadoGestionSgsst.FINALIZADA
  ) {
    return;
  }

  const ultimaEvaluacion = await prisma.evaluacionAspecto.findFirst({
    where: {
      aspecto: {
        identidadHistorica: evaluacion.aspecto.identidadHistorica,
      },
      gestion: {
        empresaPeriodoId: evaluacion.gestion.empresaPeriodoId,
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
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
    },
  });

  if (ultimaEvaluacion?.id !== evaluacion.id) {
    throw new ErrorEvaluacion(
      "La evidencia pendiente debe completarse sobre la evaluación vigente más reciente de la identidad histórica del aspecto.",
      409,
      "EVALUACION_NO_VIGENTE"
    );
  }
}
