import type { DecidirNoAplicaInput } from "../../types/evaluacion/no-aplica.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

export function normalizarDecisionNoAplica(
  data: unknown
): DecidirNoAplicaInput {
  const body = (data ?? {}) as Record<string, unknown>;
  const decision =
    typeof body.decision === "string"
      ? body.decision.trim().toUpperCase()
      : "";
  const observacion =
    typeof body.observacion === "string"
      ? body.observacion.trim()
      : "";

  if (decision !== "APROBAR" && decision !== "RECHAZAR") {
    throw new ErrorEvaluacion(
      "La decisión de No aplica debe ser APROBAR o RECHAZAR.",
      400,
      "DECISION_NO_APLICA_INVALIDA"
    );
  }

  if (decision === "RECHAZAR" && observacion.length < 10) {
    throw new ErrorEvaluacion(
      "El rechazo de No aplica requiere una observación de al menos 10 caracteres.",
      400,
      "OBSERVACION_RECHAZO_NO_APLICA_REQUERIDA"
    );
  }

  if (observacion.length > 2000) {
    throw new ErrorEvaluacion(
      "La observación no puede superar los 2000 caracteres.",
      400,
      "OBSERVACION_NO_APLICA_MUY_LARGA"
    );
  }

  return {
    decision,
    observacion: observacion || null,
  };
}
