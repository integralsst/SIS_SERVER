import {
  EstadoCumplimientoAspecto,
} from "@prisma/client";

import { ErrorEvaluacion } from "../../utils/evaluacion";

const CALIFICACION_POR_ESTADO: Record<
  EstadoCumplimientoAspecto,
  number
> = {
  [EstadoCumplimientoAspecto.NO_CUMPLIDO]: 0,
  [EstadoCumplimientoAspecto.PARCIAL]: 3,
  [EstadoCumplimientoAspecto.CUMPLIDO]: 5,
  [EstadoCumplimientoAspecto.NO_APLICA]: 5,
};

export function validarCalificacionAdministrativa(
  estado: EstadoCumplimientoAspecto,
  calificacion: number
): number {
  const esperada = CALIFICACION_POR_ESTADO[estado];

  if (
    !Number.isFinite(calificacion) ||
    ![0, 3, 5].includes(calificacion)
  ) {
    throw new ErrorEvaluacion(
      "La calificación administrativa solo puede ser 0, 3 o 5.",
      400,
      "CALIFICACION_ADMINISTRATIVA_INVALIDA"
    );
  }

  if (calificacion !== esperada) {
    throw new ErrorEvaluacion(
      `La calificación ${calificacion} no corresponde al estado ${estado}. Debe ser ${esperada}.`,
      400,
      "CALIFICACION_ESTADO_INCONSISTENTE"
    );
  }

  return esperada;
}
