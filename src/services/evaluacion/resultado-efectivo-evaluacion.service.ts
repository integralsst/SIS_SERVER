import {
  EstadoAprobacionGestion,
  EstadoCumplimientoAspecto,
  EstadoDecisionNoAplica,
  EstadoRevisionTecnica,
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

interface RevisionTecnicaResultado {
  estado: EstadoRevisionTecnica;
}

export interface EvaluacionParaResultadoEfectivo {
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: {
    toNumber(): number;
  } | number;
  decisionNoAplica?: DecisionNoAplicaResultado | null;
  aprobacionGestion?: AprobacionGestionResultado | null;
  revisionTecnica?: RevisionTecnicaResultado | null;
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
    | "GESTION_RECHAZADA"
    | "REVISION_TECNICA_PENDIENTE";
}

function numero(
  valor: { toNumber(): number } | number
): number {
  return typeof valor === "number"
    ? valor
    : valor.toNumber();
}

function revisionTecnicaBloqueante(
  evaluacion: EvaluacionParaResultadoEfectivo
): boolean {
  const estado = evaluacion.revisionTecnica?.estado;

  return (
    estado === EstadoRevisionTecnica.PENDIENTE ||
    estado === EstadoRevisionTecnica.REQUIERE_AJUSTES
  );
}

function aplicarRevisionTecnica(
  evaluacion: EvaluacionParaResultadoEfectivo,
  resultado: ResultadoEfectivoEvaluacion
): ResultadoEfectivoEvaluacion {
  /*
   * La revisión técnica es un control independiente. Mientras siga abierta,
   * la calificación registrada/efectiva participa en los cálculos, pero no
   * puede considerarse firme. Si ya existe otra causa provisional (por
   * ejemplo No aplica pendiente), conservamos esa causa primaria.
   */
  if (resultado.provisional || !revisionTecnicaBloqueante(evaluacion)) {
    return resultado;
  }

  return {
    ...resultado,
    provisional: true,
    causa: "REVISION_TECNICA_PENDIENTE",
  };
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
      return aplicarRevisionTecnica(evaluacion, {
        calificacion: resultado,
        provisional: false,
        causa: "NO_APLICA_APROBADO",
      });
    }

    return aplicarRevisionTecnica(evaluacion, {
      calificacion: resultado,
      provisional: false,
      causa: "NO_APLICA_RECHAZADO",
    });
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
      return aplicarRevisionTecnica(evaluacion, {
        calificacion: 3,
        provisional: false,
        causa: "GESTION_RECHAZADA",
      });
    }

    return aplicarRevisionTecnica(evaluacion, {
      calificacion: numero(
        evaluacion.calificacionAdministrativa
      ),
      provisional: false,
      causa: "GESTION_APROBADA",
    });
  }

  return aplicarRevisionTecnica(evaluacion, {
    calificacion: numero(
      evaluacion.calificacionAdministrativa
    ),
    provisional: false,
    causa: "REGISTRADA",
  });
}
