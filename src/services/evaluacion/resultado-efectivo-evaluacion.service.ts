import {
  EstadoAprobacionGestion,
  EstadoCumplimientoAspecto,
  EstadoDecisionNoAplica,
} from "@prisma/client";

interface DecisionNoAplicaResultado {
  estado: EstadoDecisionNoAplica;
  resultadoEfectivo: {
    toNumber(): number;
  } | number;
}

interface AprobacionGestionResultado {
  aprobacionGestion: {
    estado: EstadoAprobacionGestion;
  };
}

export interface EvaluacionParaResultadoEfectivo {
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: {
    toNumber(): number;
  } | number;
  decisionNoAplica?: DecisionNoAplicaResultado | null;
  aprobacionGestion?: AprobacionGestionResultado | null;
}

export interface ResultadoEfectivoEvaluacion {
  calificacion: number;
  provisional: boolean;
  causa:
    | "REGISTRADA"
    | "NO_APLICA_PENDIENTE"
    | "NO_APLICA_APROBADO"
    | "NO_APLICA_RECHAZADO"
    | "GESTION_PENDIENTE_APROBACION"
    | "GESTION_APROBADA"
    | "GESTION_RECHAZADA";
}

function numero(
  valor: { toNumber(): number } | number
): number {
  return typeof valor === "number"
    ? valor
    : valor.toNumber();
}

export function resolverResultadoEfectivoEvaluacion(
  evaluacion: EvaluacionParaResultadoEfectivo
): ResultadoEfectivoEvaluacion {
  /*
   * No aplica tiene su propio flujo normativo y prevalece sobre la
   * aprobación general de la gestión. Así una solicitud rechazada conserva
   * resultado efectivo 0 y una pendiente 3 sin alterar la evaluación base.
   * Las evaluaciones históricas NO_APLICA anteriores a esta fase, que no
   * tienen DecisionNoAplica relacionada, mantienen su valor registrado.
   */
  if (
    evaluacion.estadoCumplimiento ===
      EstadoCumplimientoAspecto.NO_APLICA &&
    evaluacion.decisionNoAplica
  ) {
    const resultado = numero(
      evaluacion.decisionNoAplica.resultadoEfectivo
    );

    if (
      evaluacion.decisionNoAplica.estado ===
      EstadoDecisionNoAplica.PENDIENTE
    ) {
      return {
        calificacion: resultado,
        provisional: true,
        causa: "NO_APLICA_PENDIENTE",
      };
    }

    if (
      evaluacion.decisionNoAplica.estado ===
      EstadoDecisionNoAplica.APROBADO
    ) {
      return {
        calificacion: resultado,
        provisional: false,
        causa: "NO_APLICA_APROBADO",
      };
    }

    return {
      calificacion: resultado,
      provisional: false,
      causa: "NO_APLICA_RECHAZADO",
    };
  }

  const aprobacion =
    evaluacion.aprobacionGestion?.aprobacionGestion;

  if (aprobacion) {
    if (
      aprobacion.estado ===
      EstadoAprobacionGestion.PENDIENTE
    ) {
      return {
        calificacion: numero(
          evaluacion.calificacionAdministrativa
        ),
        provisional: true,
        causa: "GESTION_PENDIENTE_APROBACION",
      };
    }

    if (
      aprobacion.estado ===
      EstadoAprobacionGestion.RECHAZADA
    ) {
      return {
        calificacion: 3,
        provisional: false,
        causa: "GESTION_RECHAZADA",
      };
    }

    return {
      calificacion: numero(
        evaluacion.calificacionAdministrativa
      ),
      provisional: false,
      causa: "GESTION_APROBADA",
    };
  }

  return {
    calificacion: numero(
      evaluacion.calificacionAdministrativa
    ),
    provisional: false,
    causa: "REGISTRADA",
  };
}
