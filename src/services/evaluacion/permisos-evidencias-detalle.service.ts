import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { asegurarCapacidadParticipanteGestion } from "./acceso-evaluacion.service";

interface ObjetivoEvidenciaDetalle {
  evaluacionId: string;
  esBorrador: boolean;
}

interface PermisosEvidenciaDetalle {
  puedeGestionarEvidencias: boolean;
  puedeCompletarEvidenciaPendiente?: boolean;
  motivoEvidencias: string | null;
  [key: string]: unknown;
}

export interface ResultadoPermisosEvidenciaDetalle {
  evidenciaObjetivo?: ObjetivoEvidenciaDetalle | null;
  evidenciaPendienteObjetivo?: ObjetivoEvidenciaDetalle | null;
  permisos: PermisosEvidenciaDetalle;
  [key: string]: unknown;
}

async function usuarioPuedeGestionarEvaluacion(
  evaluacionId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<boolean> {
  const evaluacion = await prisma.evaluacionAspecto.findUnique({
    where: {
      id: evaluacionId,
    },
    select: {
      gestionId: true,
    },
  });

  if (!evaluacion) {
    return false;
  }

  try {
    await asegurarCapacidadParticipanteGestion(
      usuario,
      evaluacion.gestionId,
      "EVIDENCIAS"
    );
    return true;
  } catch {
    return false;
  }
}

export async function alinearPermisosEvidenciasDetalle(
  resultado: ResultadoPermisosEvidenciaDetalle,
  usuario: UsuarioSesionEvaluacion
): Promise<ResultadoPermisosEvidenciaDetalle> {
  const objetivoActual = resultado.evidenciaObjetivo;
  const objetivoPendiente = resultado.evidenciaPendienteObjetivo;

  const puedeGestionarEvidencias =
    objetivoActual?.esBorrador === true
      ? await usuarioPuedeGestionarEvaluacion(
          objetivoActual.evaluacionId,
          usuario
        )
      : false;

  const puedeCompletarEvidenciaPendiente =
    Boolean(
      resultado.permisos.puedeCompletarEvidenciaPendiente &&
        objetivoPendiente
    ) &&
    Boolean(
      objetivoPendiente &&
        (await usuarioPuedeGestionarEvaluacion(
          objetivoPendiente.evaluacionId,
          usuario
        ))
    );

  let motivoEvidencias = resultado.permisos.motivoEvidencias;

  if (objetivoActual?.esBorrador && !puedeGestionarEvidencias) {
    motivoEvidencias =
      "Tu participación en esta gestión no permite gestionar evidencias.";
  } else if (
    objetivoPendiente &&
    !puedeCompletarEvidenciaPendiente
  ) {
    motivoEvidencias =
      "La evaluación finalizada conserva su calificación 5, pero tu participación no permite completar este soporte documental.";
  }

  return {
    ...resultado,
    permisos: {
      ...resultado.permisos,
      puedeGestionarEvidencias,
      puedeCompletarEvidenciaPendiente,
      motivoEvidencias,
    },
  };
}
